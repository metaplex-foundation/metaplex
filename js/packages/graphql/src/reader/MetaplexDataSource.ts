import { DataSource, DataSourceConfig } from 'apollo-datasource';
import logger from '../logger';
import { IDataAdapter } from '../adapters/IDataAdapter';
import { Context } from '../types/context';
import { getDefaultEndpointName } from '../utils/getEndpoints';
import { Resolver } from './Resolver';

export class MetaplexDataSource<
  TContext extends Context = Context,
> extends DataSource<TContext> {
  constructor(private readonly adapter: IDataAdapter<any, any>) {
    super();
  }

  initContext(context: TContext) {
    const reader = this.adapter.getReader(
      context.network || getDefaultEndpointName(),
    );

    if (!reader) {
      const err = new Error('There are no proper reader context');
      logger.error(err);
      throw err;
    }
    context.api = reader;
    context.resolver = new Resolver(reader);
  }

  // implementation for DataSource of apollo-datasource
  async initialize({ context }: DataSourceConfig<TContext>) {
    this.initContext(context);
  }
}
