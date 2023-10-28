use crate::services::user::storage::UserStore;

pub mod postgres;

pub trait PersistentStorage: UserStore + Send + Sync {}
