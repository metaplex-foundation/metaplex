// -----------------
// Example: creating a InitVault Transaction
// See: ./transactions/init-vault.ts
// -----------------

// Make sure to have a local validator running to try this as is, i.e. via `yarn amman:start`

import { Connection, Keypair, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { LOCALHOST } from '@metaplex-foundation/amman';
import { AddressLabels } from '@metaplex-foundation/amman';

// These help us identify public keys, make sure to run with
// `DEBUG=vault:* ts-node ./examples/...` to log them
import { addressLabels } from '../test/utils';

import { fundedPayer } from './helpers';

import { strict as assert } from 'assert';

import {
  QUOTE_MINT,
  createExternalPriceAccount,
  // The InitVault class holds all related methods, including methods to setup accounts
  initVault as createInitVaultIx,
  Vault,
  VaultSetup,
} from '../src/mpl-token-vault';

// Using wrapped SOL mint here, you may choose to use another
export const priceMint = QUOTE_MINT;

// Could be devnet/mainnet, depending on your use case
const host = LOCALHOST;

// -----------------
async function main() {
  console.log('+++++++ Ex: init-vault.ts  +++++++');
  const connection = new Connection(host, 'singleGossip');

  // This is the payer account which should have sufficient amount of SOL
  const payer = await fundedPayer(connection);
  const vaultAuthority = Keypair.generate();
  return initVault(
    connection,
    { payer, vaultAuthority, allowFurtherShareCreation: true },
    addressLabels,
  );
}

export async function initVault(
  connection: Connection,
  args: { payer: Keypair; vaultAuthority: Keypair; allowFurtherShareCreation?: boolean },
  addressLabels: AddressLabels,
) {
  addressLabels.addLabels(args);

  const { payer, vaultAuthority, allowFurtherShareCreation = false } = args;

  // -----------------
  // 1. Setup Accounts to use when initializing the vault
  //    You may not need to do this if you already have those accounts
  // -----------------
  const [createExternalAccountIxs, createExternalAccountSigners, { externalPriceAccount }] =
    await createExternalPriceAccount(connection, payer.publicKey);

  const vaultSetup: VaultSetup = await VaultSetup.create(connection, {
    vaultAuthority: vaultAuthority.publicKey,
    priceMint,
    externalPriceAccount,
  });

  await vaultSetup.createFracionMint(payer.publicKey);
  await vaultSetup.createFractionTreasury(payer.publicKey);
  await vaultSetup.createRedeemnTreasury(payer.publicKey);
  await vaultSetup.createVault(payer.publicKey);
  vaultSetup.assertComplete();

  const createAndSetupAccountsTx = new Transaction()
    .add(...createExternalAccountIxs)
    .add(...vaultSetup.instructions);

  await sendAndConfirmTransaction(connection, createAndSetupAccountsTx, [
    payer,
    ...createExternalAccountSigners,
    ...vaultSetup.signers,
  ]);

  // -----------------
  // 2. Using the accounts we setup above we can now initialize our vault
  // -----------------
  const initVaultIx = createInitVaultIx(vaultSetup, allowFurtherShareCreation);
  const initVaulTx = new Transaction().add(initVaultIx);
  await sendAndConfirmTransaction(connection, initVaulTx, [payer]);

  // -----------------
  // 3. We can now query the initialized vault
  // -----------------
  const initVaultAccounts = vaultSetup.getAccounts();
  const vaultAccountInfo = await connection.getAccountInfo(initVaultAccounts.vault);
  assert(vaultAccountInfo != null);
  const [vaultAccount] = Vault.fromAccountInfo(vaultAccountInfo);

  console.log({ initializedVault: vaultAccount.pretty() });

  addressLabels.addLabels(initVaultAccounts);

  return { ...initVaultAccounts, externalPriceAccount };
}

if (module === require.main) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
