

use actix_cors::Cors;
use actix_web::{middleware, web, App, HttpResponse, HttpServer};
use juniper::http::graphiql::graphiql_source;
use juniper::http::GraphQLRequest;
use std::sync::Arc;
use std::sync::RwLock;
use std::io;
use crate::schema::{Schema, Ctx};

pub struct AppServer {
    schema: Arc<Schema>,
    context: Arc<RwLock<Ctx>>
}


async fn graphiql() -> HttpResponse {
    let html = graphiql_source("http://127.0.0.1:8080/graphql", None);
    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(html)
}

async fn graphql(
    st: web::Data<Arc<Schema>>,
    ctx: web::Data<Arc<RwLock<Ctx>>>,
    data: web::Json<GraphQLRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    let user = web::block(move || {
        match ctx.get_ref().try_read() {
            Ok(context) => {
                let res = data.execute_sync(&st, &context);
                let json = serde_json::to_string(&res)?;
                return Ok::<_, serde_json::error::Error>(json);
            }
            Err(e) => {
                let json_str = format!("{{\"error\":\"{}\"}}", e.to_string());
                let json = serde_json::to_string(&json_str)?;
                return Ok::<_, serde_json::error::Error>(json);
            }
        }
    }).await?;
    Ok(HttpResponse::Ok()
        .content_type("application/json")
        .body(user))
}

impl AppServer {
    pub fn new(schema: Arc<Schema>, context: Arc<RwLock<Ctx>>) -> Self {
        AppServer {
            schema: schema,
            context: context
        }
    }
    pub async fn run(self) -> io::Result<()> {
        let schema = self.schema;
        let context = self.context;
        // Start http server
        HttpServer::new(move || {
            App::new()
                .data(schema.clone())
                .data(context.clone())
                .wrap(middleware::Logger::default())
                .wrap(
                    Cors::new()
                        .allowed_methods(vec!["POST", "GET"])
                        .supports_credentials()
                        .max_age(3600)
                        .finish(),
                )
                .service(web::resource("/graphql").route(web::post().to(graphql)))
                .service(web::resource("/graphiql").route(web::get().to(graphiql)))
        })
        .bind("127.0.0.1:8080")?
        .run()
        .await
    }
}
