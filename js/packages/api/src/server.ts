import { ApolloServer, ExpressContext } from 'apollo-server-express';
import { makeSchema } from 'nexus';
import { MetaplexApiDataSource } from './api';
import * as types from './schema';
import path from 'path';
import { performance } from 'perf_hooks';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import express from 'express';
import { createServer } from 'http';

const DIRNAME = __dirname.replace(/\/dist$/, '/src');

async function startApolloServer() {
  const api = new MetaplexApiDataSource();
  const schema = makeSchema({
    types,
    outputs: {
      schema: path.join(DIRNAME, '/generated/schema.graphql'),
      typegen: path.join(DIRNAME, '/generated/typings.ts'),
    },
    formatTypegen: (content, type) => {
      if (type === 'types') {
        content = `/* eslint-disable */ \n ${content}`;
      }
      return require('prettier').format(content, {
        arrowParens: 'avoid',
        semi: true,
        singleQuote: true,
        trailingComma: 'all',
        parser: type === 'types' ? 'typescript' : 'graphql',
      });
    },
    sourceTypes: {
      modules: [
        {
          module: path.join(DIRNAME, 'sourceTypes.ts'),
          alias: 'common',
        },
      ],
      mapping: {
        Artwork: 'common.Artwork',
        Creator: 'common.Creator',
        Auction: 'common.Auction',
      },
    },
    contextType: {
      module: path.join(DIRNAME, 'context.ts'),
      export: 'Context',
    },
    features: {
      abstractTypeStrategies: {
        resolveType: true,
      },
    },
  });

  const dataSources = () => ({
    api,
  });

  const context = ({ req }: ExpressContext) => {
    const network = req.headers.network;
    return { network };
  };

  const PORT = process.env.PORT || 4000;
  const app = express();

  const server = new ApolloServer({ schema, dataSources, context });
  await server.start();
  server.applyMiddleware({ app });
  const URL = `http://localhost:${PORT}`;
  const URL_GRAPHQL = `${URL}${server.graphqlPath}`;
  const URL_GRAPHQL_WS = `ws://localhost:${PORT}${server.graphqlPath}`;

  app.get('/', (_, res) => {
    res.redirect(
      `https://studio.apollographql.com/sandbox?endpoint=${encodeURIComponent(
        URL_GRAPHQL,
      )}`,
    );
  });

  const httpServer = createServer(app);

  SubscriptionServer.create(
    { schema, execute, subscribe },
    { server: httpServer, path: server.graphqlPath },
  );

  httpServer.listen(PORT, () => {
    console.log(`🚀 Start server at ${URL}`);
    console.log(`🚀 Query endpoint ready at ${URL_GRAPHQL}`);
    console.log(`🚀 Subscription endpoint ready at ${URL_GRAPHQL_WS}`);
  });

  if (!process.env.WARN_UP_DISABLE) {
    console.log('🌋 Start warm up data');
    const start = performance.now();
    api.preload().then(() => {
      const end = performance.now();
      console.log(
        `🌋 Finish warm up data ${((end - start) / 1000).toFixed(0)}s`,
      );
    });
  }
}

startApolloServer();
