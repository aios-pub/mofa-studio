/**
 * Podcast workshop rendering (TOOL-12): concat per-turn TTS audio into one
 * episode, optionally mixing a volume-reduced BGM bed (人声优先), and
 * export MP3. Arg builders are pure so tests verify the filter graphs
 * without running ffmpeg.
 */
use std::path::PathBuf;
use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::{err_msg, ok_data, AppState};

/// ffmpeg args to concat N audio inputs (re-encode for safety).
pub(crate) fn build_concat_args(inputs: &[String], output: &str) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();
    for input in inputs {
        args.push("-i".into());
        args.push(input.clone());
    }
    let filter = format!("concat=n={}:v=0:a=1[out]", inputs.len());
    args.extend([
        "-filter_complex".into(),
        filter,
        "-map".into(),
        "[out]".into(),
        "-c:a".into(),
        "libmp3lame".into(),
        "-q:a".into(),
        "4".into(),
        "-y".into(),
        output.into(),
    ]);
    args
}

/// ffmpeg args to mix voice + volume-reduced BGM (BGM 混音不压人声:
/// voice at full gain, bed at 0.25, output length follows the voice).
pub(crate) fn build_bgm_mix_args(
    voice: &str,
    bgm: &str,
    bgm_volume: f32,
    output: &str,
) -> Vec<String> {
    let volume = bgm_volume.clamp(0.0, 1.0);
    vec![
        "-i".into(),
        voice.into(),
        "-stream_loop".into(),
        "-1".into(), // loop the bed to cover the voice length
        "-i".into(),
        bgm.into(),
        "-filter_complex".into(),
        format!(
            "[1:a]volume={volume:.2}[bed];[0:a][bed]amix=inputs=2:duration=first:dropout_transition=0[out]"
        ),
        "-map".into(),
        "[out]".into(),
        "-c:a".into(),
        "libmp3lame".into(),
        "-q:a".into(),
        "4".into(),
        "-y".into(),
        output.into(),
    ]
}

fn ffmpeg_path() -> Option<String> {
    [
        "ffmpeg",
        "/usr/local/bin/ffmpeg",
        "/opt/homebrew/bin/ffmpeg",
    ]
    .iter()
    .find(|c| {
        std::process::Command::new(c)
            .arg("-version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    })
    .map(|c| c.to_string())
}

fn decode_to_file(dir: &std::path::Path, stem: &str, data_url: &str) -> Result<PathBuf, String> {
    let payload = data_url.split_once(",").map(|(_, p)| p).unwrap_or(data_url);
    use base64::Engine as _;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(payload.trim())
        .map_err(|e| format!("音频解码失败: {e}"))?;
    if bytes.is_empty() {
        return Err("音频内容为空".into());
    }
    let path = dir.join(format!("{}_{}.mp3", stem, uuid::Uuid::new_v4()));
    std::fs::write(&path, bytes).map_err(|e| format!("写入失败: {e}"))?;
    Ok(path)
}

/// POST /api/podcast/render {turns: [data-url], bgm?: data-url, bgm_volume?}
async fn render(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let turns = match body.get("turns").and_then(Value::as_array) {
        Some(items) if !items.is_empty() => items.clone(),
        _ => return err_msg(StatusCode::BAD_REQUEST, "turns 不能为空"),
    };
    let dir = state.data_dir.join("podcast");
    if let Err(e) = tokio::fs::create_dir_all(&dir).await {
        return err_msg(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("创建目录失败: {e}"),
        );
    }

    // Decode turn audio to temp files (blocking pool for base64 + IO).
    let dir_for_task = dir.clone();
    let turns_for_task = turns.clone();
    let turn_files = match tokio::task::spawn_blocking(move || {
        let mut files = Vec::new();
        for (index, turn) in turns_for_task.iter().enumerate() {
            let data_url = turn.as_str().unwrap_or("");
            let file = decode_to_file(&dir_for_task, &format!("turn{:02}", index), data_url)?;
            files.push(file);
        }
        Ok::<_, String>(files)
    })
    .await
    {
        Ok(Ok(files)) => files,
        Ok(Err(e)) => return err_msg(StatusCode::BAD_REQUEST, &e),
        Err(e) => return err_msg(StatusCode::INTERNAL_SERVER_ERROR, &format!("任务失败: {e}")),
    };

    let concat_out = dir.join(format!("voice_{}.mp3", uuid::Uuid::new_v4()));
    let concat_args = build_concat_args(
        &turn_files
            .iter()
            .map(|f| f.to_string_lossy().to_string())
            .collect::<Vec<_>>(),
        &concat_out.to_string_lossy(),
    );

    let Some(ffmpeg) = ffmpeg_path() else {
        return err_msg(
            StatusCode::UNPROCESSABLE_ENTITY,
            "未找到 ffmpeg：请安装 ffmpeg 后重试",
        );
    };
    let ffmpeg_for_concat = ffmpeg.clone();
    let concat_output = tokio::task::spawn_blocking(move || {
        std::process::Command::new(&ffmpeg_for_concat)
            .args(&concat_args)
            .output()
    })
    .await;
    match concat_output {
        Ok(Ok(out)) if out.status.success() => {}
        Ok(Ok(out)) => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            return err_msg(
                StatusCode::UNPROCESSABLE_ENTITY,
                &format!("拼接失败: {}", stderr.chars().take(200).collect::<String>()),
            );
        }
        _ => return err_msg(StatusCode::INTERNAL_SERVER_ERROR, "ffmpeg 执行失败"),
    }

    // Optional BGM bed over the concatenated voice.
    let bgm_data = body.get("bgm").and_then(Value::as_str);
    let bgm_volume = body
        .get("bgm_volume")
        .and_then(Value::as_f64)
        .unwrap_or(0.25) as f32;
    let final_path = if let Some(bgm) = bgm_data.filter(|s| !s.is_empty()) {
        let dir2 = dir.clone();
        let bgm_owned = bgm.to_string();
        let bgm_file =
            match tokio::task::spawn_blocking(move || decode_to_file(&dir2, "bgm", &bgm_owned))
                .await
            {
                Ok(Ok(f)) => f,
                Ok(Err(e)) => return err_msg(StatusCode::BAD_REQUEST, &e),
                Err(e) => {
                    return err_msg(StatusCode::INTERNAL_SERVER_ERROR, &format!("任务失败: {e}"))
                }
            };
        let mixed_out = dir.join(format!("episode_{}.mp3", uuid::Uuid::new_v4()));
        let mix_args = build_bgm_mix_args(
            &concat_out.to_string_lossy(),
            &bgm_file.to_string_lossy(),
            bgm_volume,
            &mixed_out.to_string_lossy(),
        );
        let mix_output = tokio::task::spawn_blocking(move || {
            std::process::Command::new(&ffmpeg).args(&mix_args).output()
        })
        .await;
        match mix_output {
            Ok(Ok(out)) if out.status.success() => mixed_out,
            Ok(Ok(out)) => {
                let stderr = String::from_utf8_lossy(&out.stderr);
                return err_msg(
                    StatusCode::UNPROCESSABLE_ENTITY,
                    &format!(
                        "BGM 混音失败: {}",
                        stderr.chars().take(200).collect::<String>()
                    ),
                );
            }
            _ => return err_msg(StatusCode::INTERNAL_SERVER_ERROR, "ffmpeg 执行失败"),
        }
    } else {
        concat_out
    };

    match tokio::fs::read(&final_path).await {
        Ok(bytes) => {
            use base64::Engine as _;
            let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
            ok_data(json!({
                "mime": "audio/mpeg",
                "data_url": format!("data:audio/mpeg;base64,{b64}"),
                "size": bytes.len(),
            }))
        }
        Err(e) => err_msg(
            StatusCode::INTERNAL_SERVER_ERROR,
            &format!("读取产物失败: {e}"),
        ),
    }
}

pub(crate) fn podcast_routes() -> Router<Arc<AppState>> {
    Router::new().route("/api/podcast/render", post(render))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn concat_args_reference_every_input() {
        let args = build_concat_args(&["a.mp3".into(), "b.mp3".into(), "c.mp3".into()], "out.mp3");
        let joined = args.join(" ");
        assert!(joined.contains("-i a.mp3"));
        assert!(joined.contains("-i c.mp3"));
        assert!(joined.contains("concat=n=3:v=0:a=1[out]"));
        assert!(joined.contains("libmp3lame"));
        assert!(joined.ends_with("-y out.mp3"));
    }

    #[test]
    fn bgm_mix_reduces_bed_volume_and_follows_voice_length() {
        let args = build_bgm_mix_args("voice.mp3", "bgm.mp3", 0.3, "out.mp3");
        let joined = args.join(" ");
        assert!(joined.contains("volume=0.30[bed]"));
        assert!(joined.contains("amix=inputs=2:duration=first"));
        assert!(joined.contains("-stream_loop -1"));
    }

    #[test]
    fn bgm_volume_is_clamped() {
        let loud = build_bgm_mix_args("v", "b", 5.0, "o");
        assert!(loud.join(" ").contains("volume=1.00"));
        let negative = build_bgm_mix_args("v", "b", -1.0, "o");
        assert!(negative.join(" ").contains("volume=0.00"));
    }
}
