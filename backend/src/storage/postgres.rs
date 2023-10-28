use axum::async_trait;
use sqlx::{Executor, PgPool};
use uuid::Uuid;
use crate::services::user::storage::creation::UserCreationData;
use crate::services::user::storage::UserStore;
use crate::services::user::User;
use crate::storage::PersistentStorage;

pub struct PostgresStorage(PgPool);

impl PostgresStorage {
    pub async fn new() -> Self {
        let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set.");
        let pool = PgPool::connect(&database_url).await
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
            user.password_hash(),
        ).execute(&self.0).await?;

        Ok(())
    }
    async fn get_user(&self, id: Uuid) -> anyhow::Result<Option<User>> {
        let user = sqlx::query_as!(User, r#"
            SELECT id, username, email
            FROM users
            WHERE id = $1
        "#, id).fetch_optional(&self.0).await?;

        Ok(user)
    }
}