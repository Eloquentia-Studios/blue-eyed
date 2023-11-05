use crate::storage::persistent::postgres::PostgresStorage;
use crate::storage::volatile::redis::RedisStorage;
use crate::storage::volatile::VolatileStorage;
use axum_macros::FromRef;
use dotenvy::dotenv;
use std::net::SocketAddr;
use std::sync::Arc;
use storage::persistent::PersistentStorage;

mod api;
mod services;
mod storage;

#[derive(Clone, FromRef)]
pub struct AppState {
    database: Arc<dyn PersistentStorage>,
    volatile: Arc<dyn VolatileStorage>,
}

#[tokio::main]
async fn main() {
    dotenv().ok();

    let storage = PostgresStorage::new().await;
    let volatile = RedisStorage::new();

    let app = api::router().with_state(AppState {
        database: Arc::new(storage),
        volatile: Arc::new(volatile),
    });

    let socket_addr: SocketAddr = "0.0.0.0:8080".parse().expect("Invalid socket address");
    println!("Starting server on {}", socket_addr);

    axum::Server::bind(&socket_addr)
        .serve(app.into_make_service())
        .await
        .expect("Unable to start server");
}
