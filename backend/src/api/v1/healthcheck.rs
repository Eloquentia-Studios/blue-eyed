use axum::{Json, Router};
use serde_json::json;

pub fn router() -> Router {
    Router::new().route("/", axum::routing::get(|| async {
        Json(json!({
            "status": "Healthy"
        }))
    }))
}
