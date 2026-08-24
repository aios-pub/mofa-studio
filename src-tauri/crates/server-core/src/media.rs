/**
 * Media toolbox (TOOL-13/14/15): video→GIF (two-pass palettegen/paletteuse),
 * video transcoding with platform profiles, and image compression with
 * target-size binary quality search. Video ops run through an ffmpeg
 * sidecar; image compression uses the native `image` encoders (PRD 09 §6).
 */

use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Arc;

use axum::extract::{Multipart, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::{err_msg, ok_data, AppState};

/// Transcoding profile presets (platform-oriented). */
#[derive(Debug, Clone, Copy)]
pub(crate) enum TranscodeProfile {
    Web1080,
    Web720,
    SocialVertical,
    GifFriendly,
}

impl TranscodeProfile {
    fn from_str_loose(s: &str) -> Option<Self> {
        match s {
            "web_1080" => Some(Self::Web1080),
            "web_720" => Some(Self::Web720),
            "social_vertical" => Some(Self::SocialVertical),
            "gif_friendly" => Some(Self::GifFriendly),
            _ => None,
        }
    }

    fn label(&self) -> &'static str {
        match self {
            Self::Web1080 => "1080p Web (H.264/AAC)",
            Self::Web720 => "720p Web (H.264/AAC)",
            Self::SocialVertical => "竖屏 9:16 (抖音/视频号)",
            Self::GifFriendly => "GIF 友好 (小尺寸高帧率源)",
        }
    }
}

/// Build the two-pass GIF args (palettegen → paletteuse) for an input.
/// Pure: tests assert the exact vectors without running ffmpeg.
pub(crate) fn build_gif_args(input: &str, palette: &str, output: &str, fps: u32, width: u32) -> Vec<Vec<String>> {
    let scale = format!("scale={width}:-1:flags=lanczos");
    vec![
        vec![
            "-i".into(), input.into(),
            "-vf".into(), format!("{},palettegen=stats_mode=diff", scale),
            "-y".into(), palette.into(),
        ],
        vec![
            "-i".into(), input.into(),
            "-i".into(), palette.into(),
            "-lavfi".into(),
            format!("paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle"),
            "-framerate".into(), fps.to_string(),
            "-y".into(), output.into(),
        ],
    ]
}

/// Build transcode args for a profile. Pure.
pub(crate) fn build_transcode_args(input: &str, output: &str, profile: TranscodeProfile) -> Vec<String> {
    let (scale, fps, x264) = match profile {
        TranscodeProfile::Web1080 => ("scale='min(1920,iw)':-2", 30u32, "crf=20"),
        TranscodeProfile::Web720 => ("scale='min(1280,iw)':-2", 30, "crf=23"),
        TranscodeProfile::SocialVertical => ("crop=ih*9/16:ih,scale=1080:-2", 30, "crf=22"),
        TranscodeProfile::GifFriendly => ("scale=480:-2", 15, "crf=26"),
    };
    vec![
        "-i".into(),
        input.into(),
        "-vf".into(),
        format!("{} ,fps={}", scale.replace(' ', ""), fps),
        "-c:v".into(),
        "libx264".into(),
        "-preset".into(),
        "medium".into(),
        "-crf".into(),
        x264.split('=').nth(1).unwrap_or("22").into(),
        "-pix_fmt".into(),
        "yuv420p".into(),
        "-c:a".into(),
        "aac".into(),
        "-b:a".into(),
        "128k".into(),
        "-movflags".into(),
        "+faststart".into(),
        "-y".into(),
        output.into(),
    ]
}

fn ffmpeg_path() -> Option<String> {
    let candidates = ["ffmpeg", "/usr/local/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg"];
    candidates
        .iter()
        .find(|c| Command::new(c)
            .arg("-version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false))
        .map(|c| c.to_string())
}

fn artifacts_dir(state: &AppState) -> PathBuf {
    state
        .data_dir
        .join("media")
}

fn unique_path(dir: &Path, stem: &str, ext: &str) -> PathBuf {
    dir.join(format!("{}_{}.{}", stem, uuid::Uuid::new_v4(), ext))
}

async fn run_ffmpeg(passes: &[Vec<String>]) -> Result<(), String> {
    let ffmpeg = ffmpeg_path().ok_or("未找到 ffmpeg：请安装 ffmpeg 后重试")?;
    for pass in passes {
        let output = Command::new(&ffmpeg)
            .args(pass)
            .output()
            .map_err(|e| format!("ffmpeg 启动失败: {e}"))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("ffmpeg 失败: {}", stderr.chars().take(300).collect::<String>()));
        }
    }
    Ok(())
}

/// Image compression with target size (KB): binary search over JPEG quality.
/// Native encoder path per PRD 09 §6 (ffmpeg is the cold-format fallback).
pub(crate) fn compress_image_bytes(
    bytes: &[u8],
    target_kb: u64,
) -> Result<(Vec<u8>, u8), String> {
    let img = image::load_from_memory(bytes).map_err(|e| format!("图片解码失败: {e}"))?;
    let target = target_kb.saturating_mul(1024).max(8 * 1024);
    let mut low = 5u8;
    let mut high = 95u8;
    let mut best: Option<(Vec<u8>, u8)> = None;
    // Binary search on quality; keep the largest quality under target.
    while low <= high {
        let mid = (low + high) / 2;
        let mut buf = Vec::new();
        let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, mid);
        img.write_with_encoder(encoder)
            .map_err(|e| format!("JPEG 编码失败: {e}"))?;
        if buf.len() as u64 <= target {
            best = Some((buf, mid));
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    // Nothing fit (tiny target on a huge image): emit at minimum quality.
    Ok(best.unwrap_or_else(|| {
        let mut buf = Vec::new();
        let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, 5);
        let _ = img.write_with_encoder(encoder);
        (buf, 5)
    }))
}

// ==================== Handlers ====================

/// POST /api/media/upload (multipart file) → { path }
async fn upload(State(state): State<Arc<AppState>>, mut multipart: Multipart) -> Response {
    let dir = artifacts_dir(&state);
    if let Err(e) = tokio::fs::create_dir_all(&dir).await {
        return err_msg(StatusCode::INTERNAL_SERVER_ERROR, &format!("创建目录失败: {e}"));
    }
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let filename = field.file_name().unwrap_or("upload.bin").to_string();
        let bytes = match field.bytes().await {
            Ok(b) => b,
            Err(e) => return err_msg(StatusCode::BAD_REQUEST, &format!("读取上传失败: {e}")),
        };
        // Only the basename survives (path traversal guard).
        let safe = Path::new(&filename)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "upload.bin".into());
        let path = unique_path(&dir, "upload", safe.rsplit('.').next().unwrap_or("bin"));
        if let Err(e) = tokio::fs::write(&path, &bytes).await {
            return err_msg(StatusCode::INTERNAL_SERVER_ERROR, &format!("写入失败: {e}"));
        }
        return ok_data(json!({ "path": path.to_string_lossy(), "size": bytes.len() }));
    }
    err_msg(StatusCode::BAD_REQUEST, "multipart 中没有文件字段")
}

/// Read + base64 a result file into a data URL response.
async fn file_data_response(path: &str, mime: &str) -> Response {
    match tokio::fs::read(path).await {
        Ok(bytes) => {
            use base64::Engine as _;
            let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
            ok_data(json!({
                "path": path,
                "mime": mime,
                "data_url": format!("data:{mime};base64,{b64}"),
                "size": bytes.len(),
            }))
        }
        Err(e) => err_msg(StatusCode::INTERNAL_SERVER_ERROR, &format!("读取产物失败: {e}")),
    }
}

/// POST /api/media/gif { path, fps?, width? }
async fn to_gif(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let input = body.get("path").and_then(Value::as_str).unwrap_or("");
    if input.is_empty() || !Path::new(input).exists() {
        return err_msg(StatusCode::BAD_REQUEST, "输入文件不存在");
    }
    let fps = body.get("fps").and_then(Value::as_u64).unwrap_or(12).clamp(1, 30) as u32;
    let width = body.get("width").and_then(Value::as_u64).unwrap_or(480).clamp(120, 1280) as u32;
    let dir = artifacts_dir(&state);
    let _ = tokio::fs::create_dir_all(&dir).await;
    let palette = unique_path(&dir, "palette", "png");
    let output = unique_path(&dir, "video", "gif");
    let passes = build_gif_args(input, &palette.to_string_lossy(), &output.to_string_lossy(), fps, width);
    if let Err(e) = run_ffmpeg(&passes).await {
        return err_msg(StatusCode::UNPROCESSABLE_ENTITY, &e);
    }
    let _ = tokio::fs::remove_file(&palette).await;
    file_data_response(&output.to_string_lossy(), "image/gif").await
}

/// POST /api/media/transcode { path, profile }
async fn transcode(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let input = body.get("path").and_then(Value::as_str).unwrap_or("");
    if input.is_empty() || !Path::new(input).exists() {
        return err_msg(StatusCode::BAD_REQUEST, "输入文件不存在");
    }
    let profile_name = body.get("profile").and_then(Value::as_str).unwrap_or("web_720");
    let Some(profile) = TranscodeProfile::from_str_loose(profile_name) else {
        return err_msg(StatusCode::BAD_REQUEST, "未知 profile，可选 web_1080/web_720/social_vertical/gif_friendly");
    };
    let dir = artifacts_dir(&state);
    let _ = tokio::fs::create_dir_all(&dir).await;
    let output = unique_path(&dir, "video", "mp4");
    let args = build_transcode_args(input, &output.to_string_lossy(), profile);
    if let Err(e) = run_ffmpeg(&[args]).await {
        return err_msg(StatusCode::UNPROCESSABLE_ENTITY, &e);
    }
    file_data_response(&output.to_string_lossy(), "video/mp4").await
}

/// POST /api/media/compress-image { path, target_kb? }
async fn compress_image(Json(body): Json<Value>) -> Response {
    let input = body.get("path").and_then(Value::as_str).unwrap_or("");
    if input.is_empty() || !Path::new(input).exists() {
        return err_msg(StatusCode::BAD_REQUEST, "输入文件不存在");
    }
    let target_kb = body.get("target_kb").and_then(Value::as_u64).unwrap_or(200).clamp(5, 10_000);
    let bytes = match tokio::fs::read(input).await {
        Ok(b) => b,
        Err(e) => return err_msg(StatusCode::INTERNAL_SERVER_ERROR, &format!("读取失败: {e}")),
    };
    // Run the CPU-bound encode on the blocking pool.
    let result = tokio::task::spawn_blocking(move || compress_image_bytes(&bytes, target_kb))
        .await
        .map_err(|e| format!("编码任务失败: {e}"));
    match result.and_then(|r| r.map_err(|e| e)) {
        Ok((jpeg, quality)) => {
            use base64::Engine as _;
            let b64 = base64::engine::general_purpose::STANDARD.encode(&jpeg);
            ok_data(json!({
                "mime": "image/jpeg",
                "data_url": format!("data:image/jpeg;base64,{b64}"),
                "size": jpeg.len(),
                "quality": quality,
                "original_size": body.get("original_size").and_then(Value::as_u64),
            }))
        }
        Err(e) => err_msg(StatusCode::UNPROCESSABLE_ENTITY, &e),
    }
}

pub(crate) fn media_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/media/upload", post(upload))
        .route("/api/media/gif", post(to_gif))
        .route("/api/media/transcode", post(transcode))
        .route("/api/media/compress-image", post(compress_image))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gif_args_use_two_pass_palette() {
        let passes = build_gif_args("in.mp4", "p.png", "out.gif", 12, 480);
        assert_eq!(passes.len(), 2, "two passes");
        let gen = passes[0].join(" ");
        assert!(gen.contains("palettegen"));
        assert!(gen.contains("scale=480:-1"));
        let use_ = passes[1].join(" ");
        assert!(use_.contains("paletteuse"));
        assert!(use_.contains("-framerate 12"));
    }

    #[test]
    fn transcode_args_match_profiles() {
        let web = build_transcode_args("in.mp4", "out.mp4", TranscodeProfile::Web1080);
        assert!(web.join(" ").contains("min(1920,iw)"));
        assert!(web.contains(&"libx264".to_string()));

        let vertical = build_transcode_args("in.mp4", "out.mp4", TranscodeProfile::SocialVertical);
        assert!(vertical.join(" ").contains("crop=ih*9/16:ih"));

        let gif_src = build_transcode_args("in.mp4", "out.mp4", TranscodeProfile::GifFriendly);
        assert!(gif_src.join(" ").contains("fps=15"));
    }

    #[test]
    fn profile_parsing_is_strict() {
        assert!(TranscodeProfile::from_str_loose("web_720").is_some());
        assert!(TranscodeProfile::from_str_loose("nope").is_none());
    }

    #[test]
    fn compress_image_hits_the_target_when_possible() {
        // 600x600 noise compresses poorly; target generous so a mid quality fits.
        let mut img = image::RgbImage::new(600, 600);
        for (x, pixel) in img.pixels_mut().enumerate() {
            *pixel = image::Rgb([(x % 255) as u8, ((x / 7) % 255) as u8, ((x * 3) % 255) as u8]);
        }
        let mut png = Vec::new();
        image::DynamicImage::ImageRgb8(img)
            .write_to(&mut std::io::Cursor::new(&mut png), image::ImageFormat::Png)
            .unwrap();
        let (jpeg, quality) = compress_image_bytes(&png, 80).expect("compression works");
        assert!(jpeg.len() as u64 <= 80 * 1024, "size {} over target", jpeg.len());
        assert!(quality > 5, "should find a non-floor quality, got {quality}");
    }

    #[test]
    fn compress_image_falls_back_to_floor_for_tiny_targets() {
        let img = image::DynamicImage::ImageRgb8(image::RgbImage::new(2000, 2000));
        let mut png = Vec::new();
        img.write_to(&mut std::io::Cursor::new(&mut png), image::ImageFormat::Png)
            .unwrap();
        let (jpeg, quality) = compress_image_bytes(&png, 1).expect("compression works");
        assert_eq!(quality, 5);
        assert!(!jpeg.is_empty());
    }
}
