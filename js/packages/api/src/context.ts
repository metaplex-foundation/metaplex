import { DataApi } from './api';

export interface Context {
  dataSources: {
    dataApi: DataApi;
  };
}
