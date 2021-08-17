import { MetaplexApi } from './api';

export interface Context {
  dataSources: {
    api: MetaplexApi;
  };
  network?: string;
}
