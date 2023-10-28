use axum::routing::{get, post};
use axum::{http, Json, Router};
use crate::services::user;

pub fn router() -> Router {
    Router::new()
        .route("/complete", get(is_setup_complete))
        .route("/admin", post(create_admin_user))
}

pub async fn is_setup_complete() -> Json<bool> {
    Json(false)
}

pub async fn create_admin_user(registration_info: user::registration::UserRegistrationInfo) -> http::StatusCode {
    dbg!(registration_info);

    http::StatusCode::CREATED
}
