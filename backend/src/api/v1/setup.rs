use std::sync::{Arc, Mutex};
use crate::services::user;
use axum::routing::{get, post};
use axum::{http, Json, Router};
use axum::extract::State;
use axum::http::StatusCode;
use crate::api::error::ApiError;
use crate::services::user::storage::UserStore;
use crate::storage::postgres::PostgresStorage;

#[derive(Clone)]
pub struct AppState {
   db: Arc<dyn UserStore + Sync + Send>
}

pub async fn router() -> Router {
    let storage = PostgresStorage::new().await;

    Router::new()
        .route("/complete", get(is_setup_complete))
        .route("/admin", post(create_admin_user))
        .with_state(AppState {
            db: Arc::new(storage)
        })
}

pub async fn is_setup_complete() -> Json<bool> {
    Json(false)
}

pub async fn create_admin_user(
    State(app_state): State<AppState>,
    registration_info: user::registration::UserRegistrationInfo,
) -> Result<StatusCode, ApiError> {
    let user = user::storage::creation::UserCreationData::new(registration_info).map_err(|_| {
        ApiError::new(
            http::StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to create user",
        )
    })?;

    app_state.db.create_user(user).await.map_err(|_| {
        ApiError::new(
            http::StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to create user",
        )
    })?;

    Ok(http::StatusCode::CREATED)
}
