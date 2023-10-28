use crate::services::user::storage::UserStore;
use anyhow::Result;
use uuid::Uuid;

pub mod registration;
pub mod storage;

pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
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
