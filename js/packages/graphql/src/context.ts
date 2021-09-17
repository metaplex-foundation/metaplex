import { MetaplexApi, MetaplexApiDataSource } from "./api";

export interface Context {
  dataSources: {
    source: MetaplexApiDataSource;
  };
  network?: string;
  api: MetaplexApi;
}
