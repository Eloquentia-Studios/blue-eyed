use crate::api::error::{ApiError, ApiFieldError};
use crate::services::authorization;
use crate::services::user::storage::UserStore;
use crate::services::user::UserId;
use anyhow::Result;
use axum::extract::FromRequest;
use axum::http::Request;
use axum::{async_trait, http, Json};
use serde_json::Value;
use ts_rs::TS;

#[derive(TS)]
#[ts(export)]
pub struct LoginCredentials {
    pub username: String,
    pub password: String,
}

pub enum LoginResult {
    Success(UserId),
    InvalidCredentials,
}

impl LoginCredentials {
    pub async fn into_user_id(self, db: &(impl UserStore + ?Sized)) -> Result<LoginResult> {
        let user = match db.get_sensitive_by_username(&self.username).await? {
            Some(user) => user,
            None => return Ok(LoginResult::InvalidCredentials),
        };

        let hashed_password =
            authorization::password::PasswordHash::from_str(user.password_hash.as_ref())?;
        if !hashed_password.verify(&user.password_hash)? {
            return Ok(LoginResult::InvalidCredentials);
        }

        Ok(LoginResult::Success(user.id.into()))
    }
}

#[async_trait]
impl<S> FromRequest<S, axum::body::Body> for LoginCredentials
where
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request(
        req: Request<axum::body::Body>,
        state: &S,
    ) -> Result<Self, Self::Rejection> {
        let body: Json<Value> = Json::from_request(req, state)
            .await
            .map_err(|_| http::StatusCode::BAD_REQUEST)?;
        let username = body.get("username").map(|u| u.as_str()).flatten();
        let password = body.get("password").map(|p| p.as_str()).flatten();

        let mut field_errors = vec![];
        if let None | Some("") = username {
            field_errors.push(ApiFieldError::new("username", "Username is required"));
        }
        if let None | Some("") = password {
            field_errors.push(ApiFieldError::new("password", "Password is required"));
        }
        if !field_errors.is_empty() {
            return Err(
                ApiError::new(http::StatusCode::BAD_REQUEST, "Invalid input")
                    .with_fields(field_errors),
            );
        }

        Ok(LoginCredentials {
            username: username
                .expect("Checked if it is none previously")
                .to_string(),
            password: password
                .expect("Checked if it is none previously")
                .to_string(),
        })
    }
}
