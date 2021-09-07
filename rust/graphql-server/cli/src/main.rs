use std::io;
use std::sync::Arc;
use std::sync::RwLock;
use std::thread;

use spl_graphql_server::schema::{create_schema, Ctx};
use spl_graphql_server::server::AppServer;

#[actix_web::main]
async fn main() -> io::Result<()> {
    std::env::set_var("RUST_LOG", "actix_web=info");
    env_logger::init();

    let context = std::sync::Arc::new(RwLock::new(Ctx::new()));

    let ctx = Arc::clone(&context);
    thread::spawn(move || {
        match ctx.try_write() {
            Ok(mut c) => {
                c.preload();
            }
            Err(_) => {}
        };
    });
    let ctx = Arc::clone(&context);
    let schema = std::sync::Arc::new(create_schema());
    let server = AppServer::new(schema, ctx);
    server.run().await
}
