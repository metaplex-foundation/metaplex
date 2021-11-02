import type { Connection } from '@solana/web3.js';
import type { IWriter } from '../ingester/types';
import type { IReader } from '../reader';

export interface IDataAdapter<
  TWriter extends IWriter,
  TReader extends IReader,
> {
  init(network: string): Promise<void>;
  getReader(network: string): TReader | undefined;
  getWriter(network: string): TWriter | undefined;
  getConnection(network: string): Connection | undefined;
}
