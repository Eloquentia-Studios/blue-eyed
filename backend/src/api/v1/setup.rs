use crate::api::error::ApiError;
use crate::storage::persistent::PersistentStorage;
use crate::{services, AppState};
use axum::extract::State;
use axum::routing::{get, post};
use axum::{http, Json, Router};
use std::sync::Arc;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/complete", get(is_setup_complete))
        .route("/admin", post(create_admin_user))
}

pub async fn is_setup_complete() -> Json<bool> {
    Json(false)
}

pub async fn create_admin_user(
    State(db): State<Arc<dyn PersistentStorage>>,
    registration_info: services::user::registration::UserRegistrationInfo,
) -> Result<http::StatusCode, ApiError> {
    services::user::User::create(db.as_ref(), registration_info)
        .await
        .map_err(|_| ApiError::from(http::StatusCode::INTERNAL_SERVER_ERROR))?;
    Ok(http::StatusCode::CREATED)
}
