#[warn(clippy::unwrap_used)]
mod api;
mod services;

use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    let app = api::router();

    let socket_addr: SocketAddr = "0.0.0.0:8080".parse().expect("Invalid socket address");
    println!("Starting server on {}", socket_addr);

    axum::Server::bind(&socket_addr)
        .serve(app.into_make_service())
        .await
        .expect("Unable to start server");
}