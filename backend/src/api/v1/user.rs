use crate::services::user::handler;
use axum::routing::get;
use axum::Router;

pub fn router() -> Router {
    Router::new().route("/", get(handler::get_current_user))
}
