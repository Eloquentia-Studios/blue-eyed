#[warn(clippy::unwrap_used)]
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};

use dotenvy::dotenv;
use crate::services::user;
use crate::storage::postgres::PostgresStorage;

mod api;
mod services;
mod storage;

#[tokio::main]
async fn main() {
    dotenv().ok();

    let storage = PostgresStorage::new().await;

    let app = api::router().await;

    let socket_addr: SocketAddr = "0.0.0.0:8080".parse().expect("Invalid socket address");
    println!("Starting server on {}", socket_addr);

    axum::Server::bind(&socket_addr)
        .serve(app.into_make_service())
        .await
        .expect("Unable to start server");
}
