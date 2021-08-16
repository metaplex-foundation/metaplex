import { MetaplexApi } from './api';

export interface Context {
  dataSources: {
    dataApi: MetaplexApi;
  };
  network?: string;
}
