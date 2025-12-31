mod api;
mod core;
mod db;

use actix_web::{App, HttpServer};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting BrainVault API on 0.0.0.0:8080");
    HttpServer::new(|| {
        App::new()
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
