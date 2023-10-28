use uuid::Uuid;

pub mod registration;
pub mod storage;

pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
}