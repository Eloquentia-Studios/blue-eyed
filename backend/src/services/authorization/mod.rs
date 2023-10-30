use crate::services::authorization::storage::SessionStore;
use axum::extract::FromRequestParts;
use uuid::Uuid;

pub mod login;
pub mod password;
pub mod storage;

pub struct Session(Uuid);

impl From<Session> for Uuid {
    fn from(value: Session) -> Self {
        value.0
    }
}

impl From<Uuid> for Session {
    fn from(value: Uuid) -> Self {
        Self(value)
    }
}
