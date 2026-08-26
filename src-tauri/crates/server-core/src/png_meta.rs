/**
 * FLOW-06: embed a workflow snapshot into generated PNGs (tEXt chunk) so a
 * canvas can be restored from its own output image — the image carries its
 * recipe. Pure chunk splicing: no pixel decoding, no extra dependencies.
 *
 * The graph JSON is base64-wrapped (tEXt text must be Latin-1; base64 is
 * ASCII-safe). Re-embedding replaces any previous snapshot in place.
 */

const PNG_SIGNATURE: [u8; 8] = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
/// The tEXt keyword we own inside generated PNGs.
pub const WORKFLOW_KEYWORD: &str = "mofa_workflow";

/// Standard CRC-32 (PNG chunk checksums).
fn crc32(data: &[u8]) -> u32 {
    let mut table = [0u32; 256];
    for (i, entry) in table.iter_mut().enumerate() {
        let mut c = i as u32;
        for _ in 0..8 {
            c = if c & 1 != 0 {
                0xEDB8_8320 ^ (c >> 1)
            } else {
                c >> 1
            };
        }
        *entry = c;
    }
    let mut crc = 0xFFFF_FFFFu32;
    for &byte in data {
        crc = table[((crc ^ byte as u32) & 0xFF) as usize] ^ (crc >> 8);
    }
    crc ^ 0xFFFF_FFFF
}

/// Split a PNG into (type, data) chunks after its signature; `None` when the
/// bytes are not a PNG.
fn chunks(png: &[u8]) -> Option<Vec<(&[u8], &[u8])>> {
    if png.len() < 8 || png[..8] != PNG_SIGNATURE {
        return None;
    }
    let mut out = Vec::new();
    let mut offset = 8;
    while offset + 8 <= png.len() {
        let length = u32::from_be_bytes([
            png[offset],
            png[offset + 1],
            png[offset + 2],
            png[offset + 3],
        ]) as usize;
        let start = offset + 8;
        let end = start.checked_add(length)?;
        if end + 4 > png.len() {
            return None;
        }
        out.push((&png[offset + 4..start], &png[start..end]));
        offset = end + 4;
    }
    Some(out)
}

/// Serialize one chunk (length + type + data + CRC).
fn chunk(kind: &[u8], data: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(12 + data.len());
    out.extend_from_slice(&(data.len() as u32).to_be_bytes());
    let mut crc_input = Vec::with_capacity(4 + data.len());
    crc_input.extend_from_slice(kind);
    crc_input.extend_from_slice(data);
    out.extend_from_slice(&crc_input);
    out.extend_from_slice(&crc32(&crc_input).to_be_bytes());
    out
}

/// Embed (or replace) the workflow snapshot in a PNG. Fails only for
/// non-PNG input, which callers pass through untouched.
pub fn embed_workflow(png: &[u8], workflow_json: &str) -> Result<Vec<u8>, String> {
    let chunks = chunks(png).ok_or("not a PNG")?;
    let b64 = base64_encode(workflow_json.as_bytes());
    let mut text_payload = Vec::with_capacity(WORKFLOW_KEYWORD.len() + 1 + b64.len());
    text_payload.extend_from_slice(WORKFLOW_KEYWORD.as_bytes());
    text_payload.push(0);
    text_payload.extend_from_slice(b64.as_bytes());

    let mut out = PNG_SIGNATURE.to_vec();
    for (kind, data) in chunks {
        if kind == b"IEND" {
            // Insert our snapshot right before the terminal chunk.
            out.extend_from_slice(&chunk(b"tEXt", &text_payload));
        } else if kind == b"tEXt" && data.starts_with(&[b'm', b'o', b'f', b'a']) {
            // Skip a stale mofa_workflow chunk (replaced above/at the end).
            let keyword_len = data.iter().position(|&b| b == 0).unwrap_or(0);
            let keyword = &data[..keyword_len];
            if keyword == WORKFLOW_KEYWORD.as_bytes() {
                continue;
            }
            out.extend_from_slice(&chunk(kind, data));
            continue;
        }
        out.extend_from_slice(&chunk(kind, data));
    }
    Ok(out)
}

/// Extract the workflow snapshot from a PNG, if it carries one.
pub fn extract_workflow(png: &[u8]) -> Option<String> {
    let chunks = chunks(png)?;
    for (kind, data) in chunks {
        if kind != b"tEXt" {
            continue;
        }
        let split = data.iter().position(|&b| b == 0)?;
        if &data[..split] != WORKFLOW_KEYWORD.as_bytes() {
            continue;
        }
        let b64 = std::str::from_utf8(&data[split + 1..]).ok()?;
        let bytes = base64_decode(b64)?;
        return String::from_utf8(bytes).ok();
    }
    None
}

// Minimal base64 (standard alphabet, padded) — avoids pulling the crate in
// where callers only need small payloads.
fn base64_encode(input: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(input.len().div_ceil(3) * 4);
    for triple in input.chunks(3) {
        let b = [
            triple[0],
            *triple.get(1).unwrap_or(&0),
            *triple.get(2).unwrap_or(&0),
        ];
        let n = ((b[0] as u32) << 16) | ((b[1] as u32) << 8) | b[2] as u32;
        out.push(TABLE[(n >> 18) as usize & 63] as char);
        out.push(TABLE[(n >> 12) as usize & 63] as char);
        out.push(if triple.len() > 1 {
            TABLE[(n >> 6) as usize & 63] as char
        } else {
            '='
        });
        out.push(if triple.len() > 2 {
            TABLE[n as usize & 63] as char
        } else {
            '='
        });
    }
    out
}

fn base64_decode(input: &str) -> Option<Vec<u8>> {
    fn val(c: u8) -> Option<u32> {
        match c {
            b'A'..=b'Z' => Some((c - b'A') as u32),
            b'a'..=b'z' => Some((c - b'a' + 26) as u32),
            b'0'..=b'9' => Some((c - b'0' + 52) as u32),
            b'+' => Some(62),
            b'/' => Some(63),
            _ => None,
        }
    }
    let bytes: Vec<u8> = input.bytes().filter(|&b| b != b'=' && b != b'\n').collect();
    let mut out = Vec::with_capacity(bytes.len() * 3 / 4);
    for quad in bytes.chunks(4) {
        if quad.len() < 2 {
            return None;
        }
        let third = quad.get(2).map(|&c| val(c)).unwrap_or(Some(0));
        let fourth = quad.get(3).map(|&c| val(c)).unwrap_or(Some(0));
        let n = (val(quad[0])? << 18) | (val(quad[1])? << 12) | (third? << 6) | fourth?;
        out.push((n >> 16) as u8);
        if quad.len() > 2 {
            out.push((n >> 8) as u8);
        }
        if quad.len() > 3 {
            out.push(n as u8);
        }
    }
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Minimal valid PNG: signature + IHDR + one IDAT + IEND (content is
    /// irrelevant — only chunk structure matters for splicing).
    fn minimal_png() -> Vec<u8> {
        let mut out = PNG_SIGNATURE.to_vec();
        out.extend_from_slice(&chunk(b"IHDR", &[0; 13]));
        out.extend_from_slice(&chunk(b"IDAT", b"fake-zlib-data"));
        out.extend_from_slice(&chunk(b"IEND", &[]));
        out
    }

    #[test]
    fn embed_and_extract_round_trip() {
        let png = minimal_png();
        let workflow = r#"{"nodes":[{"id":"a","type":"prompt_text"}],"edges":[]}"#;
        let embedded = embed_workflow(&png, workflow).unwrap();
        assert_eq!(extract_workflow(&embedded).as_deref(), Some(workflow));

        // Still a structurally valid PNG (parses back into the same chunks).
        let kinds: Vec<_> = chunks(&embedded).unwrap().iter().map(|(k, _)| *k).collect();
        assert_eq!(
            kinds,
            [
                b"IHDR".as_slice(),
                b"IDAT".as_slice(),
                b"tEXt".as_slice(),
                b"IEND".as_slice()
            ]
        );
    }

    #[test]
    fn re_embedding_replaces_the_old_snapshot() {
        let png = minimal_png();
        let once = embed_workflow(&png, r#"{"v":1}"#).unwrap();
        let twice = embed_workflow(&once, r#"{"v":2}"#).unwrap();
        assert_eq!(extract_workflow(&twice).as_deref(), Some(r#"{"v":2}"#));
        // Exactly one mofa_workflow chunk remains.
        let count = chunks(&twice)
            .unwrap()
            .iter()
            .filter(|(k, d)| {
                *k == b"tEXt"
                    && d.iter()
                        .position(|&b| b == 0)
                        .map(|len| &d[..len] == WORKFLOW_KEYWORD.as_bytes())
                        .unwrap_or(false)
            })
            .count();
        assert_eq!(count, 1);
    }

    #[test]
    fn other_text_chunks_are_preserved() {
        let mut png = minimal_png();
        // Splice a foreign tEXt (e.g. Prompt/Description) before IEND.
        let foreign = chunk(b"tEXt", b"Description\0a cat");
        let insert_at = png.len() - 12; // before the IEND chunk
        let mut with_foreign = png[..insert_at].to_vec();
        with_foreign.extend_from_slice(&foreign);
        with_foreign.extend_from_slice(&png[insert_at..]);
        png = with_foreign;

        let embedded = embed_workflow(&png, r#"{"x":1}"#).unwrap();
        assert_eq!(extract_workflow(&embedded).as_deref(), Some(r#"{"x":1}"#));
        let kinds: Vec<_> = chunks(&embedded).unwrap().iter().map(|(k, _)| *k).collect();
        assert_eq!(kinds.len(), 5, "foreign tEXt kept: {kinds:?}");
    }

    #[test]
    fn non_png_input_is_rejected_and_plain_png_has_no_workflow() {
        assert!(embed_workflow(b"JFIF...", "{}").is_err());
        assert_eq!(extract_workflow(&minimal_png()), None);
    }

    #[test]
    fn base64_handles_multibyte_json() {
        let json = r#"{"提示词":"一只橘猫"}"#;
        let embedded = embed_workflow(&minimal_png(), json).unwrap();
        assert_eq!(extract_workflow(&embedded).as_deref(), Some(json));
    }
}
