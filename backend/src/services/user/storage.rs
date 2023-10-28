use anyhow::Result;
use axum::async_trait;
use uuid::Uuid;

use crate::services::user::storage::creation::UserCreationData;
use crate::services::user::User;

#[async_trait]
pub trait UserStore {
    async fn create_user(&self, user: UserCreationData) -> Result<()>;
    async fn get_user(&self, id: Uuid) -> Result<Option<User>>;
}

pub mod creation {
    use anyhow::{anyhow, Result};
    use argon2::{Argon2, PasswordHasher};
    use argon2::password_hash::rand_core::OsRng;
    use argon2::password_hash::SaltString;
    use uuid::Uuid;

    use crate::services::user::registration::UserRegistrationInfo;

    pub struct UserCreationData {
        id: Uuid,
        username: String,
        email: String,
        password_hash: String,
    }

    impl UserCreationData {
        pub fn new(registration_data: UserRegistrationInfo) -> Result<Self> {
            let argon2: Argon2 = Argon2::default();

            let salt = SaltString::generate(&mut OsRng);
            let password_hash = match argon2.hash_password(registration_data.password().as_bytes(), &salt) {
                Ok(hash) => hash.to_string(),
                Err(e) => return Err(anyhow!(e)),
            };

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

        pub fn password_hash(&self) -> &str {
            &self.password_hash
        }
    }
}