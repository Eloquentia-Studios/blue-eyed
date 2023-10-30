use crate::services::authorization::password::PasswordHash;
use crate::services::user::storage::UserStore;
use anyhow::Result;
use sqlx::FromRow;
use std::fmt::Display;
use ts_rs::TS;
use uuid::Uuid;

pub mod registration;
pub mod storage;

#[derive(TS)]
#[ts(export)]
pub struct User {
    #[ts(type = "string")]
    pub id: UserId,
    pub username: String,
    pub email: String,
}

pub struct SensitiveUser {
    pub id: UserId,
    pub username: String,
    pub email: String,
    pub password_hash: PasswordHash,
}

impl User {
    pub async fn create(
        db: &(impl UserStore + ?Sized),
        registration_info: registration::UserRegistrationInfo,
    ) -> Result<()> {
        let user = storage::creation::UserCreationData::new(registration_info)?;
        db.create_user(user).await?;
        Ok(())
    }
}

#[derive(Debug)]
pub struct UserId(Uuid);

impl From<UserId> for Uuid {
    fn from(value: UserId) -> Self {
        value.0
    }
}

impl From<Uuid> for UserId {
    fn from(value: Uuid) -> Self {
        Self(value)
    }
}

impl Default for UserId {
    fn default() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Display for UserId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.to_string().fmt(f)
    }
}
