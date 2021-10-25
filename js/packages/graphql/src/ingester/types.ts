import {
  AccountInfoOwnerString,
  ProcessAccountsFunc,
  PublicKeyStringAndAccount,
  StringPublicKey,
  UpdateStateValueFunc,
} from '../common';

export type EndpointsMap = {
  name: string;
  endpoint: string;
}[];

export interface IProcessor<T> {
  is: (acc: AccountInfoOwnerString<Buffer>) => boolean;
  process(acc: PublicKeyStringAndAccount<Buffer>): T | undefined;
}

export interface IProgramParser {
  pubkey: StringPublicKey;
  process: ProcessAccountsFunc;
  processors: Record<string, IProcessor<any>>;
  isProcessor: (acc: AccountInfoOwnerString<Buffer>) => boolean;
}

export type ProgramParserMap = IProgramParser[];

export type ProgramParse = {
  pubkey: StringPublicKey;
  process: (account: Parameters<ProcessAccountsFunc>[0]) => Promise<void>;
};

export interface IWriter {
  networkName: string;
  init(): Promise<void>;
  listenModeOn(): void;
  flush(): Promise<void>;
  persist: UpdateStateValueFunc;
}
