import { ApolloServer } from 'apollo-server';
import { makeSchema } from 'nexus';
import { DataApi } from './api';
import * as types from './schema';
import path from 'path';

async function startApolloServer() {
  const schema = makeSchema({
    types,
    outputs: {
      schema: __dirname + '/generated/schema.graphql',
      typegen: __dirname + '/generated/typings.ts',
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
    dataApi: new DataApi(),
  });

  const server = new ApolloServer({ schema, dataSources });
  const { url } = await server.listen();
  console.log(`🚀 Server ready at ${url}`);
}

void startApolloServer();
