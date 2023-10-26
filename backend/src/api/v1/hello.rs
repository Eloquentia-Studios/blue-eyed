use axum::Router;

pub fn router() -> Router {
    Router::new()
        .route("/", axum::routing::get(|| async { "Hello, World!" }))
}