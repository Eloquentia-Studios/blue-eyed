use crate::services::user::service;
use axum::http::StatusCode;
use axum::Json;

pub async fn is_setup_complete() -> Json<bool> {
    Json(false)
}

pub async fn create_admin_user(registration_info: service::registration::UserInfo) -> StatusCode {
    dbg!(registration_info);

    StatusCode::CREATED
}
