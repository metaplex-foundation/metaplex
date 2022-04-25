import {
  PublicKey,
  Connection,
  GetProgramAccountsConfig,
  Commitment,
  AccountInfo,
} from '@solana/web3.js';
import { Account } from './accounts';
import { Buffer } from 'buffer';
import { ConnnectionWithRpcRequest } from './types';

export abstract class Program {
  static readonly PUBKEY: PublicKey;

  static async findProgramAddress(seeds: (Buffer | Uint8Array)[]) {
    return (await PublicKey.findProgramAddress(seeds, this.PUBKEY))[0];
  }

  static async getProgramAccounts(
    connection: Connection,
    configOrCommitment?: GetProgramAccountsConfig | Commitment,
  ) {
    const extra: Pick<GetProgramAccountsConfig, 'dataSlice' | 'filters'> = {};
    let commitment: Commitment | undefined;
    if (configOrCommitment) {
      if (typeof configOrCommitment === 'string') {
        commitment = configOrCommitment;
      } else {
        commitment = configOrCommitment.commitment;
        if (configOrCommitment.dataSlice) {
          extra.dataSlice = configOrCommitment.dataSlice;
        }
        if (configOrCommitment.filters) {
          extra.filters = configOrCommitment.filters;
        }
      }
    }
    const args = connection._buildArgs([this.PUBKEY.toBase58()], commitment, 'base64', extra);
    const unsafeRes = await (connection as ConnnectionWithRpcRequest)._rpcRequest(
      'getProgramAccounts',
      args,
    );

    return (
      unsafeRes.result as Array<{
        account: AccountInfo<[string, string]>;
        pubkey: string;
      }>
    )
      .map(({ account: { data, executable, lamports, owner }, pubkey }) => ({
        account: {
          data: Buffer.from(data[0], 'base64'),
          executable,
          lamports,
          owner: new PublicKey(owner),
        } as AccountInfo<Buffer>,
        pubkey: new PublicKey(pubkey),
      }))
      .map(({ pubkey, account }) => new Account(pubkey, account));
  }
}
