import { IReader, Resolver } from '../reader';

export interface Context {
  network?: string;
  api: IReader;
  resolver: Resolver;
}
