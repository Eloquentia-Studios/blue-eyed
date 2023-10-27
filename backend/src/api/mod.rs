use axum::Router;

pub mod error;
mod v1;

pub fn router() -> Router {
    Router::new().nest("/api/v1", v1::router())
}
