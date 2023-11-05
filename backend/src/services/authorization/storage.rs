use crate::services::authorization::Session;
use anyhow::Result;
use uuid::Uuid;

pub trait SessionStore {
    fn save(&self, session: &Session) -> Result<()>;
    fn get(&self, session_id: Uuid) -> Result<Option<Session>>;
}
