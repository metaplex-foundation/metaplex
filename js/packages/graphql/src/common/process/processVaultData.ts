import { decodeSafetyDeposit, decodeVault, VaultKey } from '../models/vaults';
import { VAULT_ID, AccountInfoOwnerString } from '../utils';
import { createPipeline, createProcessor } from './utils';

const isVaultAccount = (account: AccountInfoOwnerString<Buffer>) =>
  account.owner === VAULT_ID;

const isSafetyDepositBoxV1Account = (account: AccountInfoOwnerString<Buffer>) =>
  account.data[0] === VaultKey.SafetyDepositBoxV1;

const isVaultV1Account = (account: AccountInfoOwnerString<Buffer>) =>
  account.data[0] === VaultKey.VaultV1;

export const VAULT_PROCESSOR = createPipeline(
  {
    safetyDepositBoxes: createProcessor(
      acc => isSafetyDepositBoxV1Account(acc),
      acc => decodeSafetyDeposit(acc.account.data, acc.pubkey),
    ),
    vaults: createProcessor(
      acc => isVaultV1Account(acc),
      acc => decodeVault(acc.account.data, acc.pubkey),
    ),
  },
  isVaultAccount,
);
