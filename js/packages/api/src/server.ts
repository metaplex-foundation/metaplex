import { ApolloServer } from 'apollo-server';
import { ExpressContext } from 'apollo-server-express';
import { makeSchema } from 'nexus';
import { MetaplexApi } from './api';
import * as types from './schema';
import path from 'path';

async function startApolloServer() {
  const schema = makeSchema({
    types,
    outputs: {
      schema: __dirname + '/generated/schema.graphql',
      typegen: __dirname + '/generated/typings.ts',
    },
    sourceTypes: {
      modules: [
        {
          module: path.join(__dirname, 'sourceTypes.ts'),
          alias: 'common',
        },
      ],
      mapping: {
        Artwork: 'common.Metadata',
        Creator: 'common.WhitelistedCreator',
      },
    },
    contextType: {
      module: path.join(__dirname, 'context.ts'),
      export: 'Context',
    },
    features: {
      abstractTypeStrategies: {
        resolveType: true,
      },
    },
  });

  const dataSources = () => ({
    api: new MetaplexApi(),
  });

  const context = ({ req }: ExpressContext) => {
    const network = req.headers.network;
    return { network };
  };

  const server = new ApolloServer({ schema, dataSources, context });
  const { url } = await server.listen();
  console.log(`🚀 Server ready at ${url}`);

  console.log('🌋 Warm up data');
  MetaplexApi.load();
}

void startApolloServer();
