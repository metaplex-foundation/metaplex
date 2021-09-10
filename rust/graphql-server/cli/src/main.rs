use std::thread;

use spl_graphql_server::schema::{create_schema, Ctx};
use spl_graphql_server::server::AppServer;

#[tokio::main]
async fn main() {
    std::env::set_var("RUST_LOG", "actix_web=info");
    env_logger::init();

    let context = Ctx::new();
    let mut ctx = Ctx::clone(&context);

    let server = AppServer::new(create_schema, context);
    thread::spawn(move || {
        ctx.preload();
    });

    server.run().await
}
