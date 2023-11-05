use redis::{Client, Commands};
use uuid::Uuid;

use crate::services::authorization::storage::SessionStore;
use crate::services::authorization::Session;
use crate::storage::volatile::VolatileStorage;

pub struct RedisStorage(Client);

impl RedisStorage {
    pub fn new() -> Self {
        let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL must be set.");
        let client = Client::open(redis_url).expect("Failed to connect to Redis.");

        Self(client)
    }
}

impl VolatileStorage for RedisStorage {}

impl SessionStore for RedisStorage {
    fn save(&self, session: &Session) -> anyhow::Result<()> {
        let mut con = self.0.get_connection()?;
        con.set("session-".to_string() + &session.id().to_string(), session)?;

        Ok(())
    }
    fn get(&self, session_id: Uuid) -> anyhow::Result<Option<Session>> {
        let mut con = self.0.get_connection()?;
        Ok(con.get("session-".to_string() + &session_id.to_string())?)
    }
}
