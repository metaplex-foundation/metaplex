import {
  ProcessAccountsFunc,
  StringPublicKey,
  UpdateStateValueFunc,
} from "common";

export type EndpointsMap = {
  name: string;
  endpoint: string;
}[];

export type ProgramParserMap = {
  pubkey: StringPublicKey;
  process: ProcessAccountsFunc;
}[];

export type ProgramParse = {
  pubkey: StringPublicKey;
  process: (account: Parameters<ProcessAccountsFunc>[0]) => Promise<void>;
};

export interface WriterConstructor {
  build(name: string): Promise<WriterAdapter>;
}

export interface WriterAdapter {
  flush(): Promise<void>;
  persist: UpdateStateValueFunc;
}

export declare type FilterFn<T = any> = (
  rootValue?: T,
  args?: any,
  context?: any,
  info?: any
) => boolean | Promise<boolean>;
