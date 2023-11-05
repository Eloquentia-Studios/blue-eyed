use crate::services::authorization::storage::SessionStore;
use crate::services::user::UserId;
use anyhow::Result;
use chrono::{DateTime, Utc};
use redis_macros::{FromRedisValue, ToRedisArgs};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub mod login;
pub mod password;
pub mod storage;

#[derive(Serialize, Deserialize, ToRedisArgs, FromRedisValue)]
pub struct Session {
    id: Uuid,
    user_id: UserId,
    created_at: DateTime<Utc>,
}

impl Session {
    pub fn try_from_user_id(
        user_id: UserId,
        storage: &(impl SessionStore + ?Sized),
    ) -> Result<Self> {
        let session = Session::new(user_id);
        storage.save(&session)?;

        Ok(session)
    }
    pub fn id(&self) -> Uuid {
        self.id
    }
    fn new(user_id: UserId) -> Self {
        Session {
            id: Uuid::new_v4(),
            user_id,
            created_at: Utc::now(),
        }
    }
}
