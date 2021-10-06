import { DataSource, DataSourceConfig } from "apollo-datasource";
import { Context } from "../types/context";
import type { IMetaplexApi } from "./IMetaplexApi";
import { MetaplexService } from "./MetaplexService";
export class MetaplexApiDataSource<
  TContext extends Context = Context
> extends DataSource<TContext> {
  constructor(public readonly ENTRIES: IMetaplexApi[]) {
    super();
  }

  // preload all data endpoints
  preload() {
    return Promise.all(this.ENTRIES.map((entry) => entry.preload()));
  }

  initContext(context: TContext) {
    const entry =
      this.ENTRIES.find((entry) => entry.network === context.network) ??
      this.ENTRIES[0];
    context.api = entry;
    context.service = new MetaplexService(entry);
  }

  // implementation for DataSource of apollo-datasource
  async initialize({ context }: DataSourceConfig<TContext>) {
    this.initContext(context);
  }
}
