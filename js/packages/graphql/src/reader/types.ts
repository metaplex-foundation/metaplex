import { MetaTypes } from '../common';

export declare type FilterFn<T = any> = (
  rootValue?: T,
  args?: any,
  context?: any,
  info?: any,
) => boolean | Promise<boolean>;

export type PublishFn = (prop: MetaTypes, key: string) => void;

export interface IEvent {
  prop: MetaTypes;
  key: string;
  value: any;
}
