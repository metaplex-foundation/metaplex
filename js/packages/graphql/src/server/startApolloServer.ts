import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import { execute, subscribe } from 'graphql';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import logger from '../logger';
import { MetaplexDataSource } from '../reader';
import { Context } from '../types/context';
import { context, schema } from './graphqlConfig';

export async function getServer(dataSources: MetaplexDataSource<Context>) {
  const app = express();
  const httpServer = createServer(app);

  const apolloServer = new ApolloServer({
    schema,
    context,
    dataSources: () => ({ dataSources }),
    introspection: true,
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
        dataSources.initContext(context);
        return context;
      },
    },
    { server: httpServer, path: apolloServer.graphqlPath },
  );

  await apolloServer.start();
  apolloServer.applyMiddleware({
    app,
    path: '/',
  });

  return { app, httpServer, apolloServer };
}

export async function startApolloServer(
  api: MetaplexDataSource<Context>,
  port = process.env.PORT || 4000,
) {
  const { httpServer, apolloServer } = await getServer(api);
  await new Promise(resolve =>
    httpServer.listen({ port: port }, resolve as any),
  );

  const URL_GRAPHQL = `http://localhost:${port}${apolloServer.graphqlPath}`;
  const URL_GRAPHQL_WS = `ws://localhost:${port}${apolloServer.graphqlPath}`;

  logger.info(`🚀 Server ready at ${URL_GRAPHQL}`);
  logger.info(`🚀 Subscription ready at ${URL_GRAPHQL_WS}`);
}
