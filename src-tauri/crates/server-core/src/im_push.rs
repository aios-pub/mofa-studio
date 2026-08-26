/**
 * IM push connectors (TASK-23): deliver automation results to 企业微信
 * group robots and 飞书 custom bots — both are official webhook APIs with
 * the same shape (POST JSON to a bot webhook URL). Personal-WeChat
 * protocol hacks stay out per the PRD's compliance note.
 */
use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::Response;
use axum::routing::{post};
use axum::{Json, Router};
use serde_json::{json, Value};

use crate::{err_msg, ok_data, AppState};

const CHANNEL_COLLECTION: &str = "im_channel";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ChannelKind {
    WeCom,
    Feishu,
}

impl ChannelKind {
    fn from_str_loose(s: &str) -> Option<Self> {
        match s {
            "wecom" => Some(Self::WeCom),
            "feishu" => Some(Self::Feishu),
            _ => None,
        }
    }

    fn as_str(&self) -> &'static str {
        match self {
            Self::WeCom => "wecom",
            Self::Feishu => "feishu",
        }
    }
}

/// Validate a webhook URL per vendor conventions (host allow-list keeps
/// misconfigured pushes from leaking to arbitrary hosts).
pub(crate) fn validate_webhook(kind: ChannelKind, url: &str) -> Result<(), String> {
    let allowed_host: [&str; 2] = match kind {
        ChannelKind::WeCom => ["qyapi.weixin.qq.com", "https://qyapi.weixin.qq.com"],
        ChannelKind::Feishu => ["open.feishu.cn", "https://open.feishu.cn"],
    };
    let ok = allowed_host.iter().any(|host| url.contains(host));
    if !ok {
        return Err(match kind {
            ChannelKind::WeCom => "企业微信 webhook 必须指向 qyapi.weixin.qq.com".into(),
            ChannelKind::Feishu => "飞书 webhook 必须指向 open.feishu.cn".into(),
        });
    }
    Ok(())
}

/// Build the vendor payload for a markdown push. Pure and testable.
pub(crate) fn build_payload(kind: ChannelKind, title: &str, body: &str) -> Value {
    match kind {
        ChannelKind::WeCom => json!({
            "msgtype": "markdown",
            "markdown": { "content": format!("**{title}**\n{body}") },
        }),
        ChannelKind::Feishu => json!({
            "msg_type": "interactive",
            "card": {
                "header": {
                    "title": { "tag": "plain_text", "content": title },
                    "template": "blue",
                },
                "elements": [
                    { "tag": "div", "text": { "tag": "lark_md", "content": body } }
                ],
            },
        }),
    }
}

// ==================== Handlers ====================

/// POST /api/im/channels {kind, name, webhook}
async fn add_channel(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let kind_str = body.get("kind").and_then(Value::as_str).unwrap_or("");
    let Some(kind) = ChannelKind::from_str_loose(kind_str) else {
        return err_msg(StatusCode::BAD_REQUEST, "kind 必须是 wecom 或 feishu");
    };
    let name = body
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim();
    let webhook = body
        .get("webhook")
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim();
    if name.is_empty() || webhook.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "name 与 webhook 必填");
    }
    if let Err(e) = validate_webhook(kind, webhook) {
        return err_msg(StatusCode::BAD_REQUEST, &e);
    }
    let id = format!("im-{}", &uuid::Uuid::new_v4().to_string()[..8]);
    let _ = state.store.insert(
        CHANNEL_COLLECTION,
        &id,
        json!({
            "id": id,
            "kind": kind_str,
            "name": name,
            "webhook": webhook,
            "created_at": chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
        }),
    );
    ok_data(json!({ "id": id }))
}

/// GET /api/im/channels
async fn list_channels(State(state): State<Arc<AppState>>) -> Response {
    // Webhooks are secrets-ish; mask the key segment.
    let channels: Vec<Value> = state
        .store
        .list(CHANNEL_COLLECTION)
        .into_iter()
        .map(|mut doc| {
            if let Some(hook) = doc.get("webhook").and_then(Value::as_str) {
                if let Some(masked) = mask_webhook(hook) {
                    doc["webhook"] = Value::String(masked);
                }
            }
            doc
        })
        .collect();
    ok_data(channels)
}

fn mask_webhook(url: &str) -> Option<String> {
    // Query-style keys (?key=xxx, wecom) or path-style tokens (feishu).
    if let Some((prefix, key)) = url.rsplit_once('=') {
        if key.len() > 4 {
            return Some(format!("{prefix}=••••{}", &key[key.len() - 4..]));
        }
    }
    if let Some((prefix, token)) = url.rsplit_once('/') {
        if token.len() > 4 {
            return Some(format!("{prefix}/••••{}", &token[token.len() - 4..]));
        }
    }
    None
}

/// DELETE /api/im/channels/{id}
async fn remove_channel(
    State(state): State<Arc<AppState>>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Response {
    if state.store.delete(CHANNEL_COLLECTION, &id) {
        ok_data(json!({ "deleted": id }))
    } else {
        err_msg(StatusCode::NOT_FOUND, "渠道不存在")
    }
}

/// POST /api/im/push {channel_id, title, body} — deliver to the vendor.
async fn push(State(state): State<Arc<AppState>>, Json(body): Json<Value>) -> Response {
    let channel_id = body.get("channel_id").and_then(Value::as_str).unwrap_or("");
    let title = body
        .get("title")
        .and_then(Value::as_str)
        .unwrap_or("mofa-studio");
    let content = body.get("body").and_then(Value::as_str).unwrap_or("");
    if channel_id.is_empty() {
        return err_msg(StatusCode::BAD_REQUEST, "channel_id 必填");
    }
    let Some(channel) = state.store.get(CHANNEL_COLLECTION, channel_id) else {
        return err_msg(StatusCode::NOT_FOUND, "渠道不存在");
    };
    let Some(kind) =
        ChannelKind::from_str_loose(channel.get("kind").and_then(Value::as_str).unwrap_or(""))
    else {
        return err_msg(StatusCode::INTERNAL_SERVER_ERROR, "渠道数据损坏");
    };
    let webhook = channel
        .get("webhook")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    if webhook.contains('•') {
        return err_msg(StatusCode::BAD_REQUEST, "webhook 已脱敏，请重新保存渠道");
    }
    let payload = build_payload(kind, title, content);
    let resp = match state.http.post(&webhook).json(&payload).send().await {
        Ok(resp) => resp,
        Err(e) => return err_msg(StatusCode::SERVICE_UNAVAILABLE, &format!("推送失败: {e}")),
    };
    let status = resp.status();
    let result: Value = resp.json().await.unwrap_or(Value::Null);
    // Both vendors answer 200 with an errcode field on success.
    let ok = status.is_success() && result.get("errcode").and_then(Value::as_i64).unwrap_or(0) == 0;
    if ok {
        ok_data(json!({ "pushed": true, "kind": kind.as_str() }))
    } else {
        err_msg(StatusCode::BAD_GATEWAY, &format!("厂商拒绝推送: {result}"))
    }
}

pub(crate) fn im_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/im/channels", post(add_channel).get(list_channels))
        .route(
            "/api/im/channels/{id}",
            axum::routing::delete(remove_channel),
        )
        .route("/api/im/push", post(push))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn webhook_validation_per_vendor() {
        assert!(validate_webhook(
            ChannelKind::WeCom,
            "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=x"
        )
        .is_ok());
        assert!(validate_webhook(ChannelKind::WeCom, "https://evil.example.com/hook").is_err());
        assert!(validate_webhook(
            ChannelKind::Feishu,
            "https://open.feishu.cn/open-apis/bot/v2/hook/x"
        )
        .is_ok());
        assert!(validate_webhook(ChannelKind::Feishu, "https://qyapi.weixin.qq.com/x").is_err());
    }

    #[test]
    fn payloads_match_vendor_contracts() {
        let wecom = build_payload(ChannelKind::WeCom, "任务完成", "产物已交付");
        assert_eq!(wecom["msgtype"], "markdown");
        assert!(wecom["markdown"]["content"]
            .as_str()
            .unwrap()
            .contains("**任务完成**"));

        let feishu = build_payload(ChannelKind::Feishu, "任务完成", "产物已交付");
        assert_eq!(feishu["msg_type"], "interactive");
        assert_eq!(feishu["card"]["header"]["title"]["content"], "任务完成");
        assert_eq!(feishu["card"]["elements"][0]["text"]["tag"], "lark_md");
    }

    #[test]
    fn masking_hides_all_but_the_key_tail() {
        let masked = mask_webhook("https://qyapi.weixin.qq.com/hook?key=abcdef1234").unwrap();
        assert!(masked.contains("••••"));
        assert!(masked.ends_with("1234"));
        assert!(!masked.contains("abcdef"));
        assert!(mask_webhook("no-equals-sign").is_none());
    }
}
