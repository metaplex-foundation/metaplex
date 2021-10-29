import type { PassThrough } from 'stream';

export interface AsyncStream {
  stream: PassThrough;
  exec(): void;
  toStream(cb: (data: [string, string, string, string, string]) => void): Promise<void>;
}

export function getWhitelistedCreatorList(
  creatorAddress: string[],
  stores: string[],
): AsyncStream;

export function getEditionList(tokenMintList: string[]): AsyncStream;

//export function createProgramAddressEdition(tokenMintList: string[], editionNonceList: number[]): AsyncStream;
