use anyhow::Result;
use axum::async_trait;
use uuid::Uuid;

use crate::services::user::storage::creation::UserCreationData;
use crate::services::user::{SensitiveUser, User};

#[async_trait]
pub trait UserStore {
    async fn create_user(&self, user: UserCreationData) -> Result<()>;
    async fn get_by_id(&self, id: Uuid) -> Result<Option<User>>;
    async fn get_sensitive_by_username(&self, username: &str) -> Result<Option<SensitiveUser>>;
}

pub mod creation {
    use crate::services::authorization::password::PasswordHash;
    use crate::services::user::registration::UserRegistrationInfo;
    use anyhow::Result;
    use uuid::Uuid;

    pub struct UserCreationData {
        id: Uuid,
        username: String,
        email: String,
        password_hash: PasswordHash,
    }

    impl UserCreationData {
        pub fn new(registration_data: UserRegistrationInfo) -> Result<Self> {
            let password_hash = PasswordHash::create_from_str(registration_data.password())?;

            Ok(Self {
                id: Uuid::new_v4(),
                username: registration_data.username().into(),
                email: registration_data.email().into(),
                password_hash,
            })
        }

        pub fn id(&self) -> Uuid {
            self.id
        }

        pub fn username(&self) -> &str {
            &self.username
        }

        pub fn email(&self) -> &str {
            &self.email
        }

        pub fn password_hash(&self) -> &PasswordHash {
            &self.password_hash
        }
    }
}
