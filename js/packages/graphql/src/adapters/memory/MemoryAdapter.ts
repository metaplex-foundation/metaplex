import { Connection } from '@solana/web3.js';
import { createConnection } from '../../utils/createConnection';
import { getEndpoints } from '../../utils/getEndpoints';
import { IDataAdapter } from '../IDataAdapter';
import { MemoryReader } from './MemoryReader';
import { MemoryWriter } from './MemoryWriter';

export class MemoryAdapter implements IDataAdapter<MemoryWriter, MemoryReader> {
  private readonly container = new Map<
    string,
    readonly [MemoryReader, MemoryWriter, Connection]
  >();

  constructor(public readonly endpoints = getEndpoints()) {}
  async init(network: string): Promise<void> {
    const [reader, writer] = this.getBox(network);
    await Promise.all([reader.init(), writer.init()]);
  }

  private getBox(
    network: string,
  ): readonly [MemoryReader, MemoryWriter, Connection] {
    if (this.container.has(network)) {
      return this.container.get(network)!;
    }
    const entry = this.endpoints.find(p => p.name === network)!;
    const connection = createConnection(entry.endpoint, 'recent');
    const writer = new MemoryWriter(network);
    const reader = new MemoryReader(network, connection, writer);
    const box = [reader, writer, connection] as const;
    this.container.set(network, box);
    return box;
  }

  getReader(network: string): MemoryReader {
    return this.getBox(network)[0];
  }

  getWriter(network: string): MemoryWriter {
    return this.getBox(network)[1];
  }

  getConnection(network: string): Connection {
    return this.getBox(network)[2];
  }
}
