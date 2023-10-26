mod hello;

use axum::Router;

pub fn router() -> Router {
    Router::new()
        .nest("/hello", hello::router())
}