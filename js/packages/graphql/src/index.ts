import { ApolloServer } from "apollo-server-express";
import { ApolloServerPluginDrainHttpServer } from "apollo-server-core";
import express from "express";
import { createServer } from "http";
import { SubscriptionServer } from "subscriptions-transport-ws";
import { execute, subscribe } from "graphql";
import { schema, context } from "./graphqlConfig";
import { startApi, warmUp } from "./startApi";
import { Context } from "./types/context";
import { config } from "dotenv";
import logger from "./logger";

async function startApolloServer() {
  const app = express();
  const httpServer = createServer(app);

  const api = startApi();

  const server = new ApolloServer({
    schema,
    context,
    dataSources: () => ({ api }),
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close();
            },
          };
        },
      },
    ],
  });

  const subscriptionServer = SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      onConnect(context: Context) {
        api.initContext(context);
        return context;
      },
    },
    { server: httpServer, path: server.graphqlPath }
  );

  await server.start();
  server.applyMiddleware({
    app,
    path: "/",
  });

  const PORT = process.env.PORT || 4000;
  await new Promise((resolve) =>
    httpServer.listen({ port: PORT }, resolve as any)
  );

  const URL_GRAPHQL = `http://localhost:${PORT}${server.graphqlPath}`;
  const URL_GRAPHQL_WS = `ws://localhost:${PORT}${server.graphqlPath}`;

  logger.info(`🚀 Server ready at ${URL_GRAPHQL}`);
  logger.info(`🚀 Subscription ready at ${URL_GRAPHQL_WS}`);

  warmUp(api);
}

config();
startApolloServer();
