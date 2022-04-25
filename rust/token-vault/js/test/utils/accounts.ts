import { Connection, PublicKey } from '@solana/web3.js';
import { Vault } from '../../src/generated';
import { strict as assert } from 'assert';

export async function getVault(connection: Connection, address: PublicKey) {
  const accountInfo = await connection.getAccountInfo(address);
  assert(accountInfo != null, `vault ${address} should exist`);
  return Vault.fromAccountInfo(accountInfo, 0)[0];
}
