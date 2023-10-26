mod hello;
mod setup;
mod user;

use axum::response::IntoResponse;
use axum::Router;

pub fn router() -> Router {
    Router::new()
        .nest("/hello", hello::router())
        .nest("/user", user::router())
        .nest("/setup", setup::router())
}
