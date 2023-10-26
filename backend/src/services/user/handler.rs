use axum::response::IntoResponse;
use axum::Json;

pub async fn get_current_user() -> Json<Option<String>> {
    Json(None)
}
