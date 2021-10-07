import {
  ProcessAccountsFunc,
  StringPublicKey,
  UpdateStateValueFunc,
} from "../common";

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

export interface WriterConstructor<T extends WriterAdapter = WriterAdapter> {
  new (name: string): T;
}

export interface WriterAdapter {
  networkName: string;
  init(): Promise<void>;
  listenModeOn(): void;
  flush(): Promise<void>;
  persist: UpdateStateValueFunc;
}
