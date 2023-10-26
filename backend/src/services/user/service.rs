pub mod registration {
    use axum::body::HttpBody;
    use axum::extract::FromRequest;
    use axum::http::Request;
    use axum::{async_trait, http, Json, RequestExt};
    use regex::Regex;
    use std::collections::BTreeMap;

    #[derive(Debug)]
    pub struct UserInfo {
        username: String,
        email: String,
        password: String,
    }

    impl UserInfo {
        pub fn new(username: &str, email: &str, password: &str) -> Result<Self, Vec<String>> {
            let mut errors = Vec::new();

            if let Err(error) = Self::validate_username(username) {
                errors.push(error);
            }

            if let Err(error) = Self::validate_email(email) {
                errors.push(error);
            }

            if let Err(error) = Self::validate_password(password) {
                errors.push(error);
            }

            if !errors.is_empty() {
                return Err(errors);
            }

            Ok(Self {
                username: username.to_string(),
                email: email.to_string(),
                password: password.to_string(),
            })
        }

        fn validate_username(username: &str) -> Result<(), String> {
            if username.len() < 3 {
                return Err("Username must be at least 3 characters long".to_string());
            }

            if username.len() > 32 {
                return Err("Username must be at most 32 characters long".to_string());
            }

            if !username.chars().all(|c| c.is_alphanumeric()) {
                return Err("Username must only contain alphanumeric characters".to_string());
            }

            Ok(())
        }

        fn validate_email(email: &str) -> Result<(), String> {
            let email_regex =
                Regex::new(r"^[^@\s]+@[^@\s]+\.[^@\s]+$").expect("Unable to create email regex");
            if !email_regex.is_match(email) {
                return Err("Email must be valid".to_string());
            }

            Ok(())
        }

        fn validate_password(password: &str) -> Result<(), String> {
            if password.len() < 12 {
                return Err("Password must be at least 12 characters long".to_string());
            }

            Ok(())
        }
    }

    #[async_trait]
    impl<S> FromRequest<S, axum::body::Body> for UserInfo
    where
        S: Send + Sync,
    {
        type Rejection = http::StatusCode;
        async fn from_request(
            req: Request<axum::body::Body>,
            state: &S,
        ) -> Result<Self, Self::Rejection> {
            let content_type = req
                .headers()
                .get(http::header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok());
            if Some("application/json") != content_type {
                return Err(http::StatusCode::BAD_REQUEST);
            }

            let json: Json<BTreeMap<String, String>> = Json::from_request(req, state)
                .await
                .map_err(|_| http::StatusCode::BAD_REQUEST)?;
            let username = json.get("username").ok_or(http::StatusCode::BAD_REQUEST)?;
            let email = json.get("email").ok_or(http::StatusCode::BAD_REQUEST)?;
            let password = json.get("password").ok_or(http::StatusCode::BAD_REQUEST)?;

            let user_info = UserInfo::new(username, email, password)
                .map_err(|_| http::StatusCode::BAD_REQUEST)?;

            Ok(user_info)
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn username_must_be_short() {
            let username = "ab".to_string();
            let result = UserInfo::validate_username(&username);
            assert!(result.is_err());
        }

        #[test]
        fn username_must_be_long() {
            let username = "a".repeat(33);
            let result = UserInfo::validate_username(&username);
            assert!(result.is_err());
        }

        #[test]
        fn username_must_be_alphanumeric() {
            let username = "a!b".to_string();
            let result = UserInfo::validate_username(&username);
            assert!(result.is_err());
        }

        #[test]
        fn username_can_be_valid() {
            let username = "abc".to_string();
            let result = UserInfo::validate_username(&username);
            assert!(result.is_ok());
        }

        #[test]
        fn email_must_contain_at() {
            let email = "abc.com".to_string();
            let result = UserInfo::validate_email(&email);
            assert!(result.is_err());
        }

        #[test]
        fn email_must_contain_domain() {
            let email = "abc@".to_string();
            let result = UserInfo::validate_email(&email);
            assert!(result.is_err());
        }

        #[test]
        fn email_can_be_valid() {
            let email = "some.mail@mailservice.com";
            let result = UserInfo::validate_email(&email);
            assert!(result.is_ok());
        }

        #[test]
        fn password_must_be_long() {
            let password = "a".repeat(11);
            let result = UserInfo::validate_password(&password);
            assert!(result.is_err());
        }

        #[test]
        fn password_can_be_valid() {
            let password = "a".repeat(12);
            let result = UserInfo::validate_password(&password);
            assert!(result.is_ok());
        }
    }
}
