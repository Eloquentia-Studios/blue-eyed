use crate::services::setup::handler;
use axum::routing::{get, post};
use axum::Router;

pub fn router() -> Router {
    Router::new()
        .route("/complete", get(handler::is_setup_complete))
        .route("/admin", post(handler::create_admin_user))
}
