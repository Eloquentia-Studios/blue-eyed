use crate::api::error::ApiError;
use crate::services::authorization::login::{LoginCredentials, LoginResult};
use crate::services::authorization::Session;
use crate::storage::persistent::PersistentStorage;
use crate::storage::volatile::VolatileStorage;
use crate::AppState;
use axum::extract::State;
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::routing::post;
use axum::Router;
use std::sync::Arc;

pub fn router() -> Router<AppState> {
    Router::new().route("/login", post(login))
}

pub async fn login(
    State(db): State<Arc<dyn PersistentStorage>>,
    State(volatile): State<Arc<dyn VolatileStorage>>,
    login_credentials: LoginCredentials,
) -> Result<HeaderMap, ApiError> {
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

    let session = Session::try_from_user_id(user_id, volatile.as_ref())?;
    let cookie_value = "blue-eyed-token=".to_string()
        + &session.id().to_string()
        + "; Path=/; Max-Age=${sessionTime.cookie}; HttpOnly; SameSite=Strict; Secure;";
    let cookie_header = HeaderValue::from_str(&cookie_value).map_err(|_| {
        ApiError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to create cookie header",
        )
    })?;

    let mut header = HeaderMap::new();
    header.insert("Set-Cookie", cookie_header);

    Ok(header)
}
