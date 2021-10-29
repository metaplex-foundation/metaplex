import { ExpressContext } from 'apollo-server-express';
import { makeSchema } from 'nexus';
import path from 'path';
import * as types from '../schema';

const DIRNAME = path.resolve(__dirname, '..').replace(/\/dist$/, '/src');

export const schema = makeSchema({
  types,
  shouldGenerateArtifacts: process.env.NODE_ENV === 'development',
  outputs: {
    schema: path.join(DIRNAME, 'schema/generated', 'schema.graphql'),
    typegen: path.join(DIRNAME, 'schema/generated', 'typings.ts'),
  },
  formatTypegen: (content, type) => {
    if (type === 'types') {
      content = `/* eslint-disable */ \n ${content}`;
    }
    return require('prettier').format(content, {
      parser: type === 'types' ? 'typescript' : 'graphql',
    });
  },
  sourceTypes: {
    modules: [
      {
        module: path.join(DIRNAME, 'types', 'sourceTypes.ts'),
        alias: 'common',
      },
    ],
    mapping: {
      Artwork: 'common.Metadata',
      Creator: 'common.WhitelistedCreator',
    },
  },
  contextType: {
    module: path.join(DIRNAME, 'types', 'context.ts'),
    export: 'Context',
  },
  features: {
    abstractTypeStrategies: {
      resolveType: true,
    },
  },
});

export const context = ({ req }: ExpressContext) => {
  const network = req?.headers?.network;
  return { network };
};

export default {
  schema,
  context,
};
