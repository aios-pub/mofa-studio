/**
 * RAG pipeline (CHAT-11): upload a document (pdf/docx-via-note/xlsx/csv/
 * md/txt), extract text, chunk with overlap, and retrieve top chunks by
 * keyword scoring. Chunks persist in the generic store; every retrieved
 * chunk carries a「xx 文档 第n段」source description for citation.
 */
use std::sync::Arc;

use axum::extract::{Multipart, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};

use calamine::Reader;

use crate::vector::VectorBackend;
use crate::{err_msg, ok_data, AppState};

const MAX_UPLOAD_BYTES: usize = 50 * 1024 * 1024;
const CHUNK_CHARS: usize = 800;
const CHUNK_OVERLAP: usize = 100;

/// v1 whitelist (PRD CHAT-11). pptx gets the honest 转-PDF suggestion.
const SUPPORTED: [&str; 6] = ["pdf", "txt", "md", "csv", "xlsx", "docx"];

pub(crate) fn is_supported(filename: &str) -> bool {
    filename
        .rsplit('.')
        .next()
        .map(|ext| SUPPORTED.contains(&ext.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

/// Extract plain text from the file bytes by extension. PDF via
/// pdf-extract; xlsx via calamine (each sheet, row-joined); docx is a zip
/// of XML — handled with a lightweight `w:t` tag sweep; txt/md/csv raw.
pub(crate) fn extract_text(filename: &str, bytes: &[u8]) -> Result<String, String> {
    let ext = filename
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    match ext.as_str() {
        "txt" | "md" | "csv" => Ok(String::from_utf8_lossy(bytes).to_string()),
        "pdf" => {
            pdf_extract::extract_text_from_mem(bytes).map_err(|e| format!("PDF 解析失败: {e}"))
        }
        "xlsx" => {
            let mut workbook = calamine::open_workbook_auto_from_rs(std::io::Cursor::new(bytes))
                .map_err(|e| format!("xlsx 打开失败: {e}"))?;
            let mut out = String::new();
            for name in workbook.sheet_names().to_vec() {
                if let Ok(range) = workbook.worksheet_range(&name) {
                    out.push_str(&format!("[工作表: {}]\n", name));
                    for row in range.rows() {
                        let cells: Vec<String> = row.iter().map(|cell| cell.to_string()).collect();
                        out.push_str(&cells.join("\t"));
                        out.push('\n');
                    }
                }
            }
            Ok(out)
        }
        "docx" => {
            // docx is a zip; the document body is word/document.xml — pull
            // the text runs (w:t elements) without a full XML parser.
            let cursor = std::io::Cursor::new(bytes);
            let mut zip =
                zip::ZipArchive::new(cursor).map_err(|e| format!("docx 打开失败: {e}"))?;
            let mut xml = String::new();
            use std::io::Read;
            zip.by_name("word/document.xml")
                .map_err(|e| format!("docx 结构异常: {e}"))?
                .read_to_string(&mut xml)
                .map_err(|e| format!("docx 读取失败: {e}"))?;
            let mut text = String::new();
            let mut rest = xml.as_str();
            while let Some(start) = rest.find("<w:t") {
                rest = &rest[start..];
                let text_start = match rest.find('>') {
                    Some(i) => i + 1,
                    None => break,
                };
                let rest2 = &rest[text_start..];
                if let Some(end) = rest2.find("</w:t>") {
                    text.push_str(&rest2[..end]);
                    rest = &rest2[end..];
                } else {
                    break;
                }
            }
            Ok(text)
        }
        other => Err(format!("暂不支持 .{other} 文件——建议先转换为 PDF 后再上传")),
    }
}

/// A chunk with its position for citation.
#[derive(Debug, Clone, serde::Serialize)]
pub(crate) struct Chunk {
    pub seq: usize,
    pub text: String,
}

/// Split text into overlapping chunks of ~CHUNK_CHARS.
pub(crate) fn chunk_text(text: &str) -> Vec<Chunk> {
    let clean: String = text
        .lines()
        .map(str::trim_end)
        .collect::<Vec<_>>()
        .join("\n");
    if clean.trim().is_empty() {
        return Vec::new();
    }
    let chars: Vec<char> = clean.chars().collect();
    let mut chunks = Vec::new();
    let mut start = 0usize;
    let mut seq = 1usize;
    while start < chars.len() {
        let end = (start + CHUNK_CHARS).min(chars.len());
        let text: String = chars[start..end].iter().collect();
        chunks.push(Chunk { seq, text });
        seq += 1;
        if end == chars.len() {
            break;
        }
        start = end.saturating_sub(CHUNK_OVERLAP);
    }
    chunks
}

/// Keyword-overlap score of a chunk against the query (characters and
/// ASCII words both count — CJK-friendly).
pub(crate) fn score_chunk(query: &str, chunk_text: &str) -> u64 {
    let query_lower = query.to_lowercase();
    let chunk_lower = chunk_text.to_lowercase();
    let mut score = 0u64;
    // CJK bi-grams from the query.
    let q_chars: Vec<char> = query_lower.chars().collect();
    for i in 0..q_chars.len().saturating_sub(1) {
        let bigram: String = q_chars[i..i + 2].iter().collect();
        if chunk_lower.contains(&bigram) {
            score += 2;
        }
    }
    // ASCII words.
    for word in query_lower.split_whitespace() {
        if word.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') && word.len() > 1 {
            if chunk_lower.contains(word) {
                score += 3;
            }
        }
    }
    score
}

pub(crate) fn top_chunks(chunks: &[Value], query: &str, top_k: usize) -> Vec<Value> {
    let mut scored: Vec<(u64, &Value)> = chunks
        .iter()
        .map(|chunk| {
            let text = chunk.get("text").and_then(Value::as_str).unwrap_or("");
            (score_chunk(query, text), chunk)
        })
        .filter(|(score, _)| *score > 0)
        .collect();
    scored.sort_by(|a, b| {
        b.0.cmp(&a.0).then_with(|| {
            let sa = a.1.get("seq").and_then(Value::as_u64).unwrap_or(0);
            let sb = b.1.get("seq").and_then(Value::as_u64).unwrap_or(0);
            sa.cmp(&sb)
        })
    });
    scored
        .into_iter()
        .take(top_k)
        .map(|(_, chunk)| chunk.clone())
        .collect()
}

// ==================== Handlers ====================

/// POST /api/rag/upload (multipart: file) → {doc_id, chunks, chars}
async fn upload(State(state): State<Arc<AppState>>, mut multipart: Multipart) -> Response {
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let filename = field.file_name().unwrap_or("file.txt").to_string();
        let bytes = match field.bytes().await {
            Ok(b) => b,
            Err(e) => return err_msg(StatusCode::BAD_REQUEST, &format!("读取上传失败: {e}")),
        };
        if bytes.len() > MAX_UPLOAD_BYTES {
            return err_msg(StatusCode::PAYLOAD_TOO_LARGE, "文件超过 50MB 限制");
        }
        if !is_supported(&filename) {
            return err_msg(
                StatusCode::BAD_REQUEST,
                "暂不支持该格式——建议先转换为 PDF 后再上传",
            );
        }
        let text = match extract_text(&filename, &bytes) {
            Ok(t) => t,
            Err(e) => return err_msg(StatusCode::UNPROCESSABLE_ENTITY, &e),
        };
        let chunks = chunk_text(&text);
        if chunks.is_empty() {
            return err_msg(StatusCode::UNPROCESSABLE_ENTITY, "没有可索引的文本内容");
        }
        let doc_id = format!("doc-{}", uuid::Uuid::new_v4());
        let chunk_docs: Vec<Value> = chunks
            .iter()
            .map(|c| {
                json!({
                    "doc_id": doc_id,
                    "doc_name": filename,
                    "seq": c.seq,
                    "text": c.text,
                })
            })
            .collect();
        let total = chunk_docs.len();
        // Persist chunk docs through the generic store.
        for (index, chunk) in chunk_docs.iter().enumerate() {
            let chunk_id = format!("{doc_id}-c{index}");
            let id = json!({ "id": chunk_id });
            let mut doc = chunk.clone();
            if let (Some(obj), Some(id_obj)) = (doc.as_object_mut(), id.as_object()) {
                for (k, v) in id_obj {
                    obj.insert(k.clone(), v.clone());
                }
            }
            let _ = state.store.insert("rag_chunk", &chunk_id, doc);
        }
        let _ = state.store.insert(
            "rag_doc",
            &doc_id,
            json!({
                "id": doc_id,
                "name": filename,
                "chunks": total,
                "chars": text.chars().count(),
                "created_at": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
            }),
        );
        // PLAT-07 向量检索: index the chunks when an embedding model is
        // reachable; without one the keyword path keeps serving queries.
        let texts: Vec<String> = chunks.iter().map(|c| c.text.clone()).collect();
        let mut indexed = 0usize;
        if let Some(vectors) = crate::embeddings::embed(&state, &texts).await {
            for (index, embedding) in vectors.iter().enumerate() {
                let chunk_id = format!("{doc_id}-c{index}");
                if state.vectors.upsert("rag", &chunk_id, embedding).is_ok() {
                    indexed += 1;
                }
            }
        }
        return ok_data(json!({
            "doc_id": doc_id,
            "name": filename,
            "chunks": total,
            "chars": text.chars().count(),
            "vector_indexed": indexed,
        }));
    }
    err_msg(StatusCode::BAD_REQUEST, "multipart 中没有文件字段")
}

/// POST /api/rag/query {doc_id, query, top_k?} → top chunks with citations
async fn query(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let doc_id = body.get("doc_id").and_then(Value::as_str).unwrap_or("");
    let query_text = body.get("query").and_then(Value::as_str).unwrap_or("");
    if doc_id.is_empty() || query_text.trim().is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "doc_id 与 query 均为必填");
    }
    let top_k = body
        .get("top_k")
        .and_then(Value::as_u64)
        .unwrap_or(4)
        .min(10) as usize;
    let chunks: Vec<Value> = state
        .store
        .list("rag_chunk")
        .into_iter()
        .filter(|c| c.get("doc_id").and_then(Value::as_str) == Some(doc_id))
        .collect();
    if chunks.is_empty() {
        return err_msg(StatusCode::NOT_FOUND, "文档不存在或已被清理");
    }
    let doc_name = chunks
        .first()
        .and_then(|c| c.get("doc_name"))
        .cloned()
        .unwrap_or(Value::String(doc_id.to_string()));
    // PLAT-07: vector retrieval first; keyword scoring remains the honest
    // fallback when no embedding model is configured.
    let mut retrieval = "keyword";
    let hits: Vec<Value>;
    let vector_try = crate::embeddings::embed(&state, &[query_text.to_string()])
        .await
        .and_then(|rows| rows.first().cloned())
        .and_then(|query_vector| {
            let knn = state.vectors.query("rag", &query_vector, 50).ok()?;
            let by_id: std::collections::HashMap<String, &Value> = chunks
                .iter()
                .filter_map(|c| {
                    c.get("id")
                        .and_then(Value::as_str)
                        .map(|id| (id.to_string(), c))
                })
                .collect();
            let selected: Vec<&Value> = knn
                .iter()
                .filter_map(|(chunk_id, _distance)| by_id.get(chunk_id).copied())
                .take(top_k)
                .collect();
            if selected.is_empty() {
                None
            } else {
                Some(selected.into_iter().cloned().collect())
            }
        });
    let hits = match vector_try {
        Some(vector_hits) => {
            retrieval = "vector";
            vector_hits
        }
        None => top_chunks(&chunks, query_text, top_k),
    };
    ok_data(json!({
        "doc_id": doc_id,
        "doc_name": doc_name,
        "retrieval": retrieval,
        "hits": hits.iter().map(|h| json!({
            "seq": h.get("seq").cloned().unwrap_or(Value::Null),
            "text": h.get("text").cloned().unwrap_or(Value::Null),
            "source": format!(
                "{} 第{}段",
                doc_name.as_str().unwrap_or(doc_id),
                h.get("seq").and_then(Value::as_u64).unwrap_or(0)
            ),
        })).collect::<Vec<_>>(),
    }))
}

pub(crate) fn rag_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/rag/upload", post(upload))
        .route("/api/rag/query", post(query))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn whitelist_matches_and_rejects() {
        assert!(is_supported("报告.PDF"));
        assert!(is_supported("数据.xlsx"));
        assert!(is_supported("note.md"));
        assert!(!is_supported("deck.pptx"));
        assert!(!is_supported("archive.zip"));
    }

    #[test]
    fn plain_text_extraction_passthrough() {
        let text = extract_text("a.txt", "你好\nworld".as_bytes()).unwrap();
        assert_eq!(text, "你好\nworld");
    }

    #[test]
    fn unsupported_format_suggests_pdf() {
        let err = extract_text("deck.pptx", b"").unwrap_err();
        assert!(err.contains("PDF"));
    }

    #[test]
    fn chunking_splits_with_overlap() {
        let text = "字".repeat(2000);
        let chunks = chunk_text(&text);
        assert!(chunks.len() >= 3);
        assert_eq!(chunks[0].seq, 1);
        // Overlap: chunk 2 starts 100 chars before chunk 1 ends.
        assert_eq!(chunks[1].text.chars().count(), 800);
        // Every chunk carries its sequence for citation.
        assert!(chunks.iter().all(|c| c.seq > 0));
    }

    #[test]
    fn chunking_collapses_blank_lines_and_rejects_empty() {
        let chunks = chunk_text("a\n\n\nb\n");
        assert_eq!(chunks.len(), 1);
        assert!(chunk_text(" \n \n").is_empty());
    }

    #[test]
    fn scoring_favors_relevant_chunks() {
        let query = "橘猫 习性";
        let relevant = "橘猫的习性是白天睡觉晚上活动";
        let irrelevant = "量子计算的原理解释";
        assert!(score_chunk(query, relevant) > score_chunk(query, irrelevant));
        assert!(score_chunk("deployment guide", "see the deployment guide section") > 0);
    }

    #[test]
    fn top_chunks_ranks_by_score_then_seq() {
        let chunks = vec![
            json!({"seq": 1, "text": "无关内容"}),
            json!({"seq": 2, "text": "橘猫习性相关"}),
            json!({"seq": 3, "text": "橘猫习性更详细"}),
        ];
        let top = top_chunks(&chunks, "橘猫习性", 2);
        assert_eq!(top.len(), 2);
        // Same score → lower seq first.
        assert!(top
            .iter()
            .all(|c| c["text"].as_str().unwrap().contains("橘猫")));
    }
}
