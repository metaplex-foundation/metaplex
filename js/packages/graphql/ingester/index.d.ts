import type { PassThrough } from 'stream';

export function findProgramAddressList(
  programId: string,
  seeds: [string, string, string[], string[]],
): PassThrough;

export function getWhitelistedCreatorList(
  creatorAddress: string[],
  stores: string[],
): PassThrough;

export function getEditionList(tokenMintList: string[]): PassThrough;
