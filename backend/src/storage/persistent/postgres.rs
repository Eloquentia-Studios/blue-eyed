use crate::services::user::storage::creation::UserCreationData;
use crate::services::user::storage::UserStore;
use crate::services::user::{SensitiveUser, User};
use crate::storage::persistent::PersistentStorage;
use anyhow::anyhow;
use axum::async_trait;
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

pub struct PostgresStorage(PgPool);

impl PostgresStorage {
    pub async fn new() -> Self {
        let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set.");
        let pool = PgPool::connect(&database_url)
            .await
            .expect("Failed to connect to Postgres.");

        Self(pool)
    }
}

impl PersistentStorage for PostgresStorage {}

#[async_trait]
impl UserStore for PostgresStorage {
    async fn create_user(&self, user: UserCreationData) -> anyhow::Result<()> {
        sqlx::query!(
            r#"
                INSERT INTO users (id, username, email, password)
                VALUES ($1, $2, $3, $4)
            "#,
            user.id(),
            user.username(),
            user.email(),
            user.password_hash().as_ref(),
        )
        .execute(&self.0)
        .await
        .map(|_| ())
        .map_err(|e| anyhow!(e))
    }
    async fn get_by_id(&self, id: Uuid) -> anyhow::Result<Option<User>> {
        sqlx::query_as!(
            User, // todo: It's a bit weird that the user has exposed properties
            r#"
            SELECT id, username, email
            FROM users
            WHERE id = $1
        "#,
            id
        )
        .fetch_optional(&self.0)
        .await
        .map_err(|e| anyhow!(e))
    }

    async fn get_sensitive_by_username(
        &self,
        username: &str,
    ) -> anyhow::Result<Option<SensitiveUser>> {
        let query_result = sqlx::query_as!(
            SensitiveUserQuery,
            r#"
            SELECT id, username, email, password AS password_hash
            FROM users
            WHERE username = $1
        "#,
            username
        )
        .fetch_optional(&self.0)
        .await
        .map_err(|e| anyhow!(e))?;

        match query_result {
            Some(row) => Ok(Some(SensitiveUser {
                id: row.id.into(),
                username: row.username,
                email: row.email,
                password_hash: row.password_hash.try_into()?,
            })),
            None => Ok(None),
        }
    }
}

struct SensitiveUserQuery {
    id: Uuid,
    username: String,
    email: String,
    password_hash: String,
}
