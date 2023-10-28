use axum::Router;

pub mod error;
mod v1;

pub async fn router() -> Router {
    Router::new().nest("/api/v1", v1::router().await)
}
