import { Test } from 'tape';
import {
  airdrop,
  assertConfirmedTransaction,
  assertTransactionSummary,
  LOCALHOST,
  PayerTransactionHandler,
} from '@metaplex-foundation/amman';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { addressLabels } from '.';
import {
  activateVault,
  ActivateVaultAccounts,
  createExternalPriceAccount,
  QUOTE_MINT,
  VaultSetup,
  initVault as createInitVaultIx,
  CompletedVaultSetup,
} from '../../src/mpl-token-vault';

export async function init() {
  const [payer, payerPair] = addressLabels.genKeypair('payer');
  const [vaultAuthority, vaultAuthorityPair] = addressLabels.genKeypair('vaultAuthority');

  const connection = new Connection(LOCALHOST, 'confirmed');
  await airdrop(connection, payer, 2);

  const transactionHandler = new PayerTransactionHandler(connection, payerPair);
  return {
    transactionHandler,
    connection,
    payer,
    payerPair,
    vaultAuthority,
    vaultAuthorityPair,
  };
}

export async function initVaultSetup(
  t: Test,
  connection: Connection,
  transactionHandler: PayerTransactionHandler,
  payer: PublicKey,
  vaultAuthority: PublicKey,
): Promise<CompletedVaultSetup> {
  // -----------------
  // Create External Account
  // -----------------
  const [createExternalAccountIxs, createExternalAccountSigners, { externalPriceAccount }] =
    await createExternalPriceAccount(connection, payer);

  const priceMint = QUOTE_MINT;

  addressLabels.addLabels({ externalPriceAccount, priceMint });

  // -----------------
  // Setup Init Vault Accounts
  // -----------------
  const vaultSetup: VaultSetup = await VaultSetup.create(connection, {
    vaultAuthority,
    priceMint,
    externalPriceAccount,
  });

  await vaultSetup.createFracionMint(payer);
  await vaultSetup.createFractionTreasury(payer);
  await vaultSetup.createRedeemnTreasury(payer);
  await vaultSetup.createVault(payer);

  addressLabels.addLabels(vaultSetup.getAccounts());

  const createAndSetupAccountsTx = new Transaction()
    .add(...createExternalAccountIxs)
    .add(...vaultSetup.instructions);

  const createAndSetupAccountsRes = await transactionHandler.sendAndConfirmTransaction(
    createAndSetupAccountsTx,
    [...createExternalAccountSigners, ...vaultSetup.signers],
  );

  assertConfirmedTransaction(t, createAndSetupAccountsRes.txConfirmed);
  assertTransactionSummary(t, createAndSetupAccountsRes.txSummary, {
    msgRx: [/Update External Price Account/i, /InitializeMint/i, /InitializeAccount/i, /success/],
  });

  vaultSetup.assertComplete();
  return vaultSetup;
}

export async function initVault(t: Test, args: { allowFurtherShareCreation?: boolean } = {}) {
  const { transactionHandler, connection, payer, payerPair, vaultAuthority, vaultAuthorityPair } =
    await init();
  const vaultSetup = await initVaultSetup(t, connection, transactionHandler, payer, vaultAuthority);
  const { allowFurtherShareCreation = false } = args;
  const initVaultIx = createInitVaultIx(vaultSetup, allowFurtherShareCreation);

  const initVaultTx = new Transaction().add(initVaultIx);
  await transactionHandler.sendAndConfirmTransaction(initVaultTx, []);

  return {
    connection,
    transactionHandler,
    accounts: {
      payer,
      payerPair,
      vaultAuthorityPair,
      fractionMintAuthority: vaultSetup.fractionMintAuthority,
      ...vaultSetup.getAccounts(),
      priceMint: vaultSetup.priceMint,
    },
  };
}

export async function initAndActivateVault(
  t: Test,
  args: { allowFurtherShareCreation?: boolean; numberOfShares?: number } = {},
) {
  const { numberOfShares = 0 } = args;
  const { transactionHandler, connection, accounts: initVaultAccounts } = await initVault(t, args);
  const {
    vault,
    authority: vaultAuthority,
    vaultAuthorityPair,
    fractionMint,
    fractionTreasury,
  } = initVaultAccounts;

  addressLabels.addLabels(initVaultAccounts);

  const accounts: ActivateVaultAccounts = {
    vault,
    vaultAuthority,
    fractionMint,
    fractionTreasury,
  };

  const activateVaultIx = await activateVault(vault, accounts, numberOfShares);

  const tx = new Transaction().add(activateVaultIx);
  const signers = [vaultAuthorityPair];
  await transactionHandler.sendAndConfirmTransaction(tx, signers);

  return {
    connection,
    transactionHandler,
    accounts: initVaultAccounts,
  };
}
