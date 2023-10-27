use axum::Router;

mod v1;
pub mod error;

pub fn router() -> Router {
    Router::new().nest("/api/v1", v1::router())
}
