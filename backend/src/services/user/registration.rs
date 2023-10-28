use std::collections::BTreeMap;

use axum::{async_trait, http, Json, RequestExt};
use axum::body::HttpBody;
use axum::extract::FromRequest;
use axum::http::Request;
use regex::Regex;
use ts_rs::TS;

use crate::api::error::{ApiError, ApiFieldError};

#[derive(Debug, TS)]
#[ts(export)]
pub struct UserRegistrationInfo {
    username: String,
    email: String,
    password: String,
}

impl UserRegistrationInfo {
    pub fn new(username: &str, email: &str, password: &str) -> Result<Self, ValidationError> {
        let errors = ValidationError {
            username: Self::validate_username(username).err(),
            email: Self::validate_email(email).err(),
            password: Self::validate_password(password).err(),
        };

        if let ValidationError {
            username: None,
            email: None,
            password: None,
        } = errors
        {
            Ok(Self {
                username: username.to_string(),
                email: email.to_string(),
                password: password.to_string(),
            })
        } else {
            Err(errors)
        }
    }

    pub fn username(&self) -> &str {
        &self.username
    }

    pub fn email(&self) -> &str {
        &self.email
    }

    pub fn password(&self) -> &str {
        &self.password
    }

    fn validate_username(username: &str) -> Result<(), &'static str> {
        if username.len() < 3 {
            return Err("Username must be at least 3 characters long");
        }

        if username.len() > 32 {
            return Err("Username must be at most 32 characters long");
        }

        if !username.chars().all(|c| c.is_alphanumeric()) {
            return Err("Username must only contain alphanumeric characters");
        }

        Ok(())
    }

    fn validate_email(email: &str) -> Result<(), &'static str> {
        let email_regex =
            Regex::new(r"^[^@\s]+@[^@\s]+\.[^@\s]+$").expect("Unable to create email regex");
        if !email_regex.is_match(email) {
            return Err("Email is invalid");
        }

        Ok(())
    }

    fn validate_password(password: &str) -> Result<(), &'static str> {
        if password.len() < 12 {
            return Err("Password must be at least 12 characters long");
        }

        Ok(())
    }
}

#[async_trait]
impl<S> FromRequest<S, axum::body::Body> for UserRegistrationInfo
    where
        S: Send + Sync,
{
    type Rejection = ApiError;
    async fn from_request(
        req: Request<axum::body::Body>,
        state: &S,
    ) -> Result<Self, Self::Rejection> {
        // Check that the content type is application/json
        let content_type = req
            .headers()
            .get(http::header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok());

        if Some("application/json") != content_type {
            return Err(ApiError::new(
                http::StatusCode::BAD_REQUEST,
                "Content-Type must be application/json",
            ));
        }

        // Extract the JSON body
        let json: Json<BTreeMap<String, String>> =
            Json::from_request(req, state).await.map_err(|_| {
                ApiError::new(
                    http::StatusCode::BAD_REQUEST,
                    "Incorrectly formatted JSON string",
                )
            })?;

        // Validate that the JSON body contains the correct fields
        let username = json.get("username").ok_or_else(|| {
            ApiError::new(http::StatusCode::BAD_REQUEST, "missing username field")
        })?;
        let email = json
            .get("email")
            .ok_or_else(|| ApiError::new(http::StatusCode::BAD_REQUEST, "missing email field"))?;
        let password = json.get("password").ok_or_else(|| {
            ApiError::new(http::StatusCode::BAD_REQUEST, "missing password field")
        })?;

        // Validate the user info
        Ok(UserRegistrationInfo::new(username, email, password)?)
    }
}

pub struct ValidationError {
    username: Option<&'static str>,
    email: Option<&'static str>,
    password: Option<&'static str>,
}

impl From<ValidationError> for ApiError {
    fn from(errors: ValidationError) -> Self {
        let mut field_errors = Vec::new();
        if let Some(username) = errors.username {
            field_errors.push(ApiFieldError::new("username", &username));
        }
        if let Some(email) = errors.email {
            field_errors.push(ApiFieldError::new("email", &email));
        }
        if let Some(password) = errors.password {
            field_errors.push(ApiFieldError::new("password", &password));
        }

        ApiError::new(http::StatusCode::BAD_REQUEST, "Invalid user info").with_fields(field_errors)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn username_must_be_short() {
        let username = "ab".to_string();
        let result = UserRegistrationInfo::validate_username(&username);
        assert!(result.is_err());
    }

    #[test]
    fn username_must_be_long() {
        let username = "a".repeat(33);
        let result = UserRegistrationInfo::validate_username(&username);
        assert!(result.is_err());
    }

    #[test]
    fn username_must_be_alphanumeric() {
        let username = "a!b".to_string();
        let result = UserRegistrationInfo::validate_username(&username);
        assert!(result.is_err());
    }

    #[test]
    fn username_can_be_valid() {
        let username = "abc".to_string();
        let result = UserRegistrationInfo::validate_username(&username);
        assert!(result.is_ok());
    }

    #[test]
    fn email_must_contain_at() {
        let email = "abc.com".to_string();
        let result = UserRegistrationInfo::validate_email(&email);
        assert!(result.is_err());
    }

    #[test]
    fn email_must_contain_domain() {
        let email = "abc@".to_string();
        let result = UserRegistrationInfo::validate_email(&email);
        assert!(result.is_err());
    }

    #[test]
    fn email_can_be_valid() {
        let email = "some.mail@mailservice.com";
        let result = UserRegistrationInfo::validate_email(&email);
        assert!(result.is_ok());
    }

    #[test]
    fn password_must_be_long() {
        let password = "a".repeat(11);
        let result = UserRegistrationInfo::validate_password(&password);
        assert!(result.is_err());
    }

    #[test]
    fn password_can_be_valid() {
        let password = "a".repeat(12);
        let result = UserRegistrationInfo::validate_password(&password);
        assert!(result.is_ok());
    }
}
