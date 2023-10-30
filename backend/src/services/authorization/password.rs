use anyhow::{anyhow, Result};
use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::SaltString;
use argon2::{Argon2, PasswordHasher, PasswordVerifier};

pub struct PasswordHash(String); // Probably should wrap argon2::PasswordHash, but lifetimes.

impl PasswordHash {
    pub fn from_str(password: &str) -> Result<Self> {
        let argon2: Argon2 = Argon2::default();

        let salt = SaltString::generate(&mut OsRng);
        argon2
            .hash_password(password.as_bytes(), &salt)
            .map(|hash| PasswordHash(hash.to_string()))
            .map_err(|e| anyhow!(e))
    }
    pub fn verify(&self, password: &PasswordHash) -> Result<bool> {
        let argon2: Argon2 = Argon2::default();

        let hash = argon2::PasswordHash::new(self.0.as_str()).map_err(|e| anyhow!(e))?;

        match argon2.verify_password(password.as_ref().as_bytes(), &hash) {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }
}

impl TryFrom<String> for PasswordHash {
    type Error = anyhow::Error;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        let _ = argon2::PasswordHash::new(value.as_str()).map_err(|e| anyhow!(e))?;

        Ok(PasswordHash(value.to_string()))
    }
}

impl AsRef<str> for PasswordHash {
    fn as_ref(&self) -> &str {
        &self.0
    }
}
