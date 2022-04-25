import test from 'tape';

import { addressLabels, init, killStuckProcess } from './utils';
import { Transaction } from '@solana/web3.js';
import { assertConfirmedTransaction, assertTransactionSummary } from '@metaplex-foundation/amman';
import { AddSharesToTreasuryInstructionAccounts, QUOTE_MINT, Vault } from '../src/mpl-token-vault';
import {
  addSharesToTreasury,
  createExternalPriceAccount,
  initVault,
  VaultSetup,
} from '../src/instructions';
import {
  approveTokenTransfer,
  createMint,
  createTokenAccount,
  getMintRentExempt,
  getTokenRentExempt,
  mintTokens,
} from '../src/common/helpers';

killStuckProcess();

/**
 * Skipping this test since we cannot figure out how to do this.
 * There are some conditions that are conflicting:
 *
 * 1. in order to add shares via a token we need to mint fractionMint shares to it first
 * 2. if the vault has mint authority we can no longer mint them
 * 3. so it looks like we need to mint those fractionMint shares to the account
 *    and then transfer mint authority to the vault when we initialize it
 * 4. However when we init the vault it insists that no mint supply for the fractionMint exists
 *
 *    Program log: Instruction: Init Vault
 *    Program log: Vault mint not empty on init
 *
 *    due to: src/processor.rs:963
 *
 *    if fraction_mint.supply != 0 {
 *        return Err(VaultError::VaultMintNotEmpty.into());
 *    }
 *
 * 5. in conclusion the following is true:
 *
 *  a) when initializing the vault the fractionMint cannot have minted anything ever
 *  b) thus we cannot premint to a token account
 *  c) however to add shares we need a token acount which holds fractionMints
 *  d) the vault provides no instruction to have it mint shares to a separate token account
 *  e) thus we can only add shares from a token account that's already in the
 *     vault maybe from a safety deposit, but I see no use for that
 *
 */
test.skip('add shares: active vault which allows further share creation, add 5', async (t) => {
  const { transactionHandler, connection, payer, payerPair, vaultAuthority, vaultAuthorityPair } =
    await init();

  const SHARES_AMOUNT = 5;
  // -----------------
  // Create Mint owned by Payer, a token account and mint to it
  // -----------------
  const mintRentExempt = await getMintRentExempt(connection);
  const [createMintIxs, createMintSigners, { mintAccount: mint }] = createMint(
    payer,
    mintRentExempt,
    0,
    payer, // mintAuthority
    payer, // freezeAuthority
  );

  const tokenAccountRentExempt = await getTokenRentExempt(connection);
  const [createTokenIxs, createTokenSigners, { tokenAccount, tokenAccountPair }] =
    createTokenAccount(payer, tokenAccountRentExempt, mint, payer);

  const mintTokensIx = mintTokens(mint, tokenAccount, payer, SHARES_AMOUNT);

  addressLabels.addLabels({ mint, tokenAccount });
  {
    const tx = new Transaction()
      .add(...createMintIxs)
      .add(...createTokenIxs)
      .add(mintTokensIx);
    const res = await transactionHandler.sendAndConfirmTransaction(tx, [
      ...createMintSigners,
      ...createTokenSigners,
      tokenAccountPair,
    ]);
    assertConfirmedTransaction(t, res.txConfirmed);
    console.log({ mintToTokenTx: res.txSignature });
  }

  // -----------------
  // Create External Account
  // -----------------
  const [createExternalAccountIxs, createExternalAccountSigners, { externalPriceAccount }] =
    await createExternalPriceAccount(connection, payer);

  const priceMint = QUOTE_MINT;

  addressLabels.addLabels({ externalPriceAccount, priceMint });

  // -----------------
  // Init Vault supplying our fractionMint whose mint authority is transferred to the vault
  // -----------------
  const vaultSetup: VaultSetup = await VaultSetup.create(connection, {
    vaultAuthority,
    priceMint,
    externalPriceAccount,
  });

  await vaultSetup.supplyFractionMint(mint, payerPair);
  await vaultSetup.createFractionTreasury(payer);
  await vaultSetup.createRedeemnTreasury(payer);
  await vaultSetup.createVault(payer);
  vaultSetup.assertComplete();

  const initVaultIx = initVault(vaultSetup, true);
  /*
   * Program log: Instruction: Init Vault
   * Program log: Vault mint not empty on init
   *
   * due to: src/processor.rs:963
   *
   * if fraction_mint.supply != 0 {
   *     return Err(VaultError::VaultMintNotEmpty.into());
   * }
   *
   */
  {
    const tx = new Transaction()
      .add(...createExternalAccountIxs)
      .add(...vaultSetup.instructions)
      .add(initVaultIx);
    const res = await transactionHandler.sendAndConfirmTransaction(tx, [
      ...createExternalAccountSigners,
      ...vaultSetup.signers,
    ]);
    assertConfirmedTransaction(t, res.txConfirmed);
    console.log({ initVault: res.txSignature });
  }

  addressLabels.addLabels(vaultSetup);

  // -----------------
  // Prepare Add Shares Instruction
  // -----------------
  const [approveTransferIx, transferAuthorityPair] = approveTokenTransfer({
    owner: payer,
    sourceAccount: tokenAccount,
    amount: SHARES_AMOUNT,
  });
  const createAndSetupAccountsTx = new Transaction().add(approveTransferIx);

  const createAndSetupAccountsRes = await transactionHandler.sendAndConfirmTransaction(
    createAndSetupAccountsTx,
    [transferAuthorityPair],
  );
  console.log({ createAndSetupAccountsRes: createAndSetupAccountsRes.txSignature });

  assertConfirmedTransaction(t, createAndSetupAccountsRes.txConfirmed);
  assertTransactionSummary(t, createAndSetupAccountsRes.txSummary, {
    msgRx: [/Update External Price Account/i, /SetAuthority/i, /InitializeAccount/i, /success/],
  });

  console.log(
    (await Vault.fromAccountAddress(connection, vaultSetup.vaultPair.publicKey)).pretty(),
  );
  // -----------------
  // Add Shares
  // -----------------
  const accounts: AddSharesToTreasuryInstructionAccounts = {
    vault: vaultSetup.vaultPair.publicKey,
    vaultAuthority,
    source: tokenAccount,
    fractionTreasury: vaultSetup.fractionTreasury,
    transferAuthority: transferAuthorityPair.publicKey,
  };
  const addSharesToTreasuryIx = addSharesToTreasury(accounts, SHARES_AMOUNT);
  const addSharesToTreasuryTx = new Transaction().add(addSharesToTreasuryIx);
  const addSharesToTreasuryRes = await transactionHandler.sendAndConfirmTransaction(
    addSharesToTreasuryTx,
    [vaultAuthorityPair, transferAuthorityPair],
  );
  console.log(addSharesToTreasuryRes);
});
