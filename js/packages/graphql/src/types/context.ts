import { Reader, Resolver } from '../reader';

export interface Context {
  network?: string;
  api: Reader;
  resolver: Resolver;
}
