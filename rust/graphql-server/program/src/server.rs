use crate::schema::{Ctx, Schema};
use futures::FutureExt;
use juniper::InputValue;
use juniper_graphql_ws::ConnectionConfig;
use juniper_warp::playground_filter;
use juniper_warp::subscriptions::serve_graphql_ws;
use std::sync::Arc;
use std::{collections::HashMap, convert::Infallible};
use warp::Filter;

pub struct AppServer {
    create_schema: Box<fn() -> Schema>,
    context: Ctx,
}

impl AppServer {
    pub fn new(create_schema: fn() -> Schema, context: Ctx) -> Self {
        AppServer {
            create_schema: Box::new(create_schema),
            context: context,
        }
    }
    pub async fn run(self) {
        let qm_schema = (*self.create_schema)();
        let base_context = Arc::new(self.context);

        let context = Arc::clone(&base_context);
        let qm_state = warp::any().map(move || {
            return Ctx::clone(&context);
        });
        let qm_graphql_filter = juniper_warp::make_graphql_filter(qm_schema, qm_state.boxed());
        let root_node = Arc::new((*self.create_schema)());
        let log = warp::log("warp_subscriptions");
        let context = Arc::clone(&base_context);
        let routes = (warp::path("subscriptions")
            .and(warp::ws())
            .map(move |ws: warp::ws::Ws| {
                let root_node = Arc::clone(&root_node);
                let context = Arc::clone(&context);

                let ctx = Ctx::clone(&context);
                ws.on_upgrade(move |websocket| async move {
                    let connection_config = move |_: HashMap<String, InputValue>| async move {
                        Ok(ConnectionConfig::new(ctx)) as Result<_, Infallible>
                    };

                    serve_graphql_ws(websocket, root_node, connection_config)
                        .map(|r| {
                            if let Err(e) = r {
                                println!("Websocket error: {}", e);
                            }
                        })
                        .await
                })
            }))
        .map(|reply| {
            // TODO#584: remove this workaround
            warp::reply::with_header(reply, "Sec-WebSocket-Protocol", "graphql-ws")
        })
        .or(warp::post()
            .and(warp::path("graphql"))
            .and(qm_graphql_filter))
        .or(warp::get()
            .and(warp::path("playground"))
            .and(playground_filter("/graphql", Some("/subscriptions"))))
        .with(log);
        warp::serve(routes).run(([127, 0, 0, 1], 8080)).await;
    }
}
