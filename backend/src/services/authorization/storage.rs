use crate::services::authorization::Session;
use crate::services::user::UserId;
use anyhow::Result;

pub trait SessionStore {
    fn create(&self, user_id: UserId) -> Result<Session>;
    fn read(&self, session_id: Session) -> Result<Option<UserId>>;
}
