/**
 * Local session auth.
 *
 * In local-first mode there is no login screen and no credential store: the
 * single on-device user is implicit. `login`/`register` always succeed and
 * mint the same long-lived JWT the agentos backend would issue, so the
 * frontend `Authorization: Bearer ...` flow works unchanged. The server only
 * listens on 127.0.0.1, so treating the loopback origin as the local user is
 * the trust boundary.
 */

use std::sync::Arc;

use axum::extract::State;
use axum::response::Response;
use axum::routing::post;
use axum::Router;
use jsonwebtoken::{encode, Header, Validation};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::{ok_data, AppState};

// ==================== Types ====================

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: usize,
}

/// The implicit on-device user.
fn local_user() -> Value {
    json!({
        "avatar": Value::Null,
        "email": "local@mofa-studio.local",
        "email_verified": true,
        "username": "local",
    })
}

// ==================== Token helpers ====================

/// Access-token lifetime: 30 days (the local app re-mints silently anyway).
const ACCESS_TOKEN_SECS: i64 = 30 * 24 * 3600;
/// Refresh-token lifetime: 90 days.
const REFRESH_TOKEN_SECS: i64 = 90 * 24 * 3600;

fn mint_token(secret: &str, subject: &str, lifetime_secs: i64) -> String {
    let claims = Claims {
        sub: subject.to_string(),
        exp: (chrono::Utc::now().timestamp() + lifetime_secs) as usize,
    };
    // Header::default() already selects HS256, matching the agentos backend
    let key = jsonwebtoken::EncodingKey::from_secret(secret.as_bytes());
    encode(&Header::default(), &claims, &key)
        .expect("JWT encoding cannot fail with valid HS256 secret")
}

/// Best-effort validation used only to keep tokens well-formed.
#[allow(dead_code)]
pub fn verify_token(secret: &str, token: &str) -> bool {
    let key = jsonwebtoken::DecodingKey::from_secret(secret.as_bytes());
    jsonwebtoken::decode::<Claims>(
        token,
        &key,
        &Validation::new(jsonwebtoken::Algorithm::HS256),
    )
    .is_ok()
}

// ==================== Handlers ====================

async fn login(State(state): State<Arc<AppState>>) -> Response {
    ok_data(login_payload(&state))
}

async fn register(State(state): State<Arc<AppState>>) -> Response {
    ok_data(login_payload(&state))
}

async fn logout() -> Response {
    ok_data(Value::Null)
}

async fn current_user() -> Response {
    ok_data(local_user())
}

async fn refresh_token(State(state): State<Arc<AppState>>) -> Response {
    ok_data(login_payload(&state))
}

async fn reset_password() -> Response {
    ok_data(Value::Null)
}

// ==================== Routes ====================

/// Auth routes matching the agentos `/api/auth/...` surface.
pub(crate) fn auth_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/api/auth/login", post(login))
        .route("/api/auth/register", post(register))
        .route("/api/auth/logout", post(logout))
        .route("/api/auth/current_user", post(current_user))
        .route("/api/auth/refresh_token", post(refresh_token))
        .route("/api/auth/reset_password", post(reset_password))
}

/// Body shape expected by `services/real/auth.ts` (snake_case backend fields).
fn login_payload(state: &AppState) -> Value {
    json!({
        "access_token": mint_token(&state.jwt_secret, "local-user", ACCESS_TOKEN_SECS),
        "refresh_token": mint_token(&state.jwt_secret, "local-user-refresh", REFRESH_TOKEN_SECS),
        "user": local_user(),
    })
}
