import { MetaTypes } from '../common';

export declare type FilterFn<T = any> = (
  rootValue?: T,
  args?: any,
  context?: any,
  info?: any,
) => boolean | Promise<boolean>;

export type PublishFn = (prop: MetaTypes, key: string) => void;

export interface IEvent {
  readonly prop: MetaTypes;
  readonly key: string;
  readonly value: any;
}
