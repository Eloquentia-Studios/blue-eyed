use crate::services::authorization::storage::SessionStore;

pub mod redis;

pub trait VolatileStorage: SessionStore + Send + Sync {}
