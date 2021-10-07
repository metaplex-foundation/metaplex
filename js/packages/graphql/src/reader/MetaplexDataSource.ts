import { DataSource, DataSourceConfig } from "apollo-datasource";
import logger from "logger";
import { ReadAdapter } from "reader";
import { getDefaultEndpointName } from "utils/getEndpoints";
import { Context } from "../types/context";

export class MetaplexDataSource<
  TContext extends Context = Context
> extends DataSource<TContext> {
  constructor(private readonly adapter: ReadAdapter) {
    super();
  }

  initContext(context: TContext) {
    const reader = this.adapter.getReader(
      context.network || getDefaultEndpointName()
    );

    if (!reader) {
      const err = new Error("There are no proper reader context");
      logger.error(err);
      throw err;
    }
    context.api = reader;
    // context.service = new MetaplexService(entry);
  }

  // implementation for DataSource of apollo-datasource
  async initialize({ context }: DataSourceConfig<TContext>) {
    await this.adapter.init();
    this.initContext(context);
  }
}
