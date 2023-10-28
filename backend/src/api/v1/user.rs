use crate::AppState;
use axum::routing::get;
use axum::{Json, Router};

pub fn router() -> Router<AppState> {
    Router::new().route("/", get(get_current_user))
}

pub async fn get_current_user() -> Json<Option<String>> {
    Json(None)
}
