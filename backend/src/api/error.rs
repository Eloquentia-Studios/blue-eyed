use std::error::Error;
use axum::{http, Json};
use axum::response::{IntoResponse, Response};
use serde::{Serialize, Serializer};
use serde::ser::SerializeMap;

pub struct ApiError {
    code: http::StatusCode,
    message: &'static str,
    fields: Option<Vec<ApiFieldError>>,
}

#[derive(Serialize)]
pub struct ApiFieldError {
    field: &'static str,
    message: &'static str,
}

impl ApiError {
    pub fn new(code: http::StatusCode, message: &'static str) -> Self {
        Self {
            code,
            message,
            fields: None,
        }
    }

    pub fn with_fields(mut self, fields: Vec<ApiFieldError>) -> Self {
        self.fields = Some(fields);
        self
    }
}

impl ApiFieldError {
    pub fn new(field: &'static str, message: &'static str) -> Self {
        Self { field, message }
    }
}

impl Serialize for ApiError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error> where S: Serializer {
           let mut map = serializer.serialize_map(Some(2))?;
            map.serialize_entry("code", &self.code.as_u16())?; // Serialize the status code as a u16
            map.serialize_entry("message", self.message)?; // Serialize the message
            if let Some(fields) = &self.fields { // Serialize the field errors if they exist
                map.serialize_entry("fields", fields)?;
            }
            map.end()
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.code, Json(self)).into_response()
    }
}

impl From<http::StatusCode> for ApiError {
    fn from(code: http::StatusCode) -> Self {
        type StatusCode = http::StatusCode;

        match code {
            StatusCode::BAD_REQUEST => Self::new(code, "Bad Request"),
            StatusCode::UNAUTHORIZED => Self::new(code, "Unauthorized"),
            StatusCode::FORBIDDEN => Self::new(code, "Forbidden"),
            StatusCode::NOT_FOUND => Self::new(code, "Not Found"),
            StatusCode::METHOD_NOT_ALLOWED => Self::new(code, "Method Not Allowed"),
            StatusCode::CONFLICT => Self::new(code, "Conflict"),
            StatusCode::INTERNAL_SERVER_ERROR => Self::new(code, "Internal Server Error"),
            _ => Self::new(code, "Unknown Error"),
        }
    }
}