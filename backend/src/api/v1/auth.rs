use crate::api::error::ApiError;
use crate::services::authorization::login::{LoginCredentials, LoginResult};
use crate::storage::persistent::PersistentStorage;
use crate::AppState;
use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::post;
use axum::{Router};
use std::sync::Arc;

pub fn router() -> Router<AppState> {
    Router::new().route("/login", post(login))
}

pub async fn login(
    State(db): State<Arc<dyn PersistentStorage>>,
    login_credentials: LoginCredentials,
) -> Result<StatusCode, ApiError> {
    let result = login_credentials.into_user_id(db.as_ref()).await?;

    let user_id = match result {
        LoginResult::Success(user_id) => user_id,
        LoginResult::InvalidCredentials => {
            return Err(ApiError::new(
                StatusCode::UNAUTHORIZED,
                "Username or password is incorrect",
            ))
        }
    };

    dbg!(user_id);

    Ok(StatusCode::OK)
}
