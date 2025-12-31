use actix_web::{App, HttpServer};
// use brainvault_backend::api; // cargo might not pick up the library name immediately in main.rs if not defined carefully, but usually it works.
// Actually, for simplicity, main can just rely on lib if cargo.toml defines [lib].
// If I use "mod api" here, it duplicates code.
// I will just use `brainvault_backend` crate.

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting BrainVault API on 0.0.0.0:8080");
    HttpServer::new(|| {
        App::new()
         // .configure(brainvault_backend::api::config) // example
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
