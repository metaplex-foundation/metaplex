import type { Connection } from '@solana/web3.js';
import type { IWriter } from '../ingester/types';
import type { Reader } from '../reader';

export interface IDataAdapter<TWriter extends IWriter, TReader extends Reader> {
  init(network: string): Promise<void>;
  getReader(network: string): TReader;
  getWriter(network: string): TWriter;
  getConnection(network: string): Connection;
}
