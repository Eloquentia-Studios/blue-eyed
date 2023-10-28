mod setup;
mod user;

use axum::routing::get;
use axum::{Json, Router};
use serde_json::{json, Value};
use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::<AppState>::new()
        .route("/healthcheck", get(health_check))
        .nest("/user", user::router())
        .nest("/setup", setup::router())
}

async fn health_check() -> Json<Value> {
    Json(json!({
        "status": "Healthy"
    }))
}
