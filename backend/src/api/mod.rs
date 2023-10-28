use crate::AppState;
use axum::Router;

pub mod error;
mod v1;

pub fn router() -> Router<AppState> {
    Router::new().nest("/api/v1", v1::router())
}
