// -----------------
// Example: Life of Vault, showing the different stages of a vault
// -----------------

// Make sure to have a local validator running to try this as is, i.e. via `yarn amman:start`

import { Connection, Keypair, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { airdrop, LOCALHOST, TokenBalances } from '@metaplex-foundation/amman';
import { strict as assert } from 'assert';

// These help us identify public keys, make sure to run with
// `DEBUG=vault:* ts-node ./examples/...` to log them
import { addressLabels } from '../test/utils';

import { fundedPayer } from './helpers';

import {
  Vault,
  ActivateVaultAccounts,
  activateVault,
  SetAuthorityInstructionAccounts,
  createSetAuthorityInstruction,
  MintFractionalSharesInstructionAccounts,
  mintSharesToTreasury,
  cusper,
  CombineVaultSetup,
  combineVault,
  WithdrawTokenFromSafetyDepositBoxAccounts,
  setupWithdrawFromSafetyDestinationAccount,
  withdrawTokenFromSafetyDepositBox,
} from '../src/mpl-token-vault';
import { initVault, priceMint } from './init-vault';
import { addTokenToVault } from './add-token-to-inactive-vault.single-transaction';
import { pdaForVault } from '../src/common/helpers';

// Could be devnet/mainnet, depending on your use case
const host = LOCALHOST;
async function main() {
  console.log('+++++++ Ex: life-of-vault.ts  +++++++');
  const connection = new Connection(host, 'confirmed');

  // This is the payer account funding the vault which should have sufficient amount of SOL
  const payerPair = await fundedPayer(connection);
  // Authority of the vault which controls it via token-vault instructions
  let vaultAuthorityPair = Keypair.generate();

  // -----------------
  // 1. Initialize the Vault
  //    follow the `initVault` call inside `./init-vault.ts` for more details
  // -----------------
  console.log('1. Init Vault');
  const initVaultAccounts = await initVault(
    connection,
    {
      payer: payerPair,
      vaultAuthority: vaultAuthorityPair,
      allowFurtherShareCreation: true,
    },
    addressLabels,
  );
  const { vault, fractionMint, fractionTreasury, redeemTreasury, externalPriceAccount } =
    initVaultAccounts;
  let vaultAuthority = initVaultAccounts.authority;
  const fractionMintAuthority = await pdaForVault(initVaultAccounts.vault);

  // -----------------
  // 2. While still inactive we can add tokens to the vault
  //    follow the `addTokenToVault` call inside `./add-token-to-inactive-vault.single-transaction.ts` for more details
  // -----------------
  console.log('2. Add Token to Vault');
  const TOKEN_AMOUNT = 2;
  const safetyDeposit = await addTokenToVault(
    connection,
    payerPair,
    vaultAuthorityPair,
    initVaultAccounts.vault,
    addressLabels,
    TOKEN_AMOUNT,
  );

  // -----------------
  // 3. Activate the vault which has the following consequences
  //
  // - no more tokens can be added to the vault
  // - unless we allowed this during vault initialization (we did) no more shares can be created
  // -----------------
  console.log('3. Activate Vault');
  {
    const accounts: ActivateVaultAccounts = {
      vault,
      vaultAuthority,
      fractionMint,
      fractionTreasury,
    };

    const NUMBER_OF_SHARES = 10;
    const activateVaultIx = await activateVault(vault, accounts, NUMBER_OF_SHARES);
    const tx = new Transaction().add(activateVaultIx);
    const signers = [payerPair, vaultAuthorityPair];
    const sig = await sendAndConfirmTransaction(connection, tx, signers);

    console.log('... query token balances');
    // We can now verify that the NUMBER_OF_SHARES were transferred to the `fractionMintAuthority`
    // as part of the activate vault transaction
    addressLabels.addLabels({ fractionMintAuthority });
    await TokenBalances.forTransaction(connection, sig, addressLabels).dump();
  }

  // -----------------
  // 4.Even though the vault is active we can still change the vault authority
  // -----------------
  console.log('4. Update Vault Authority');
  const [newAuthority, newAuthorityPair] = addressLabels.genKeypair('newAuthority');
  await airdrop(connection, newAuthority, 1);
  {
    const accounts: SetAuthorityInstructionAccounts = {
      vault,
      currentAuthority: vaultAuthority,
      newAuthority,
    };
    const setAuthorityIx = createSetAuthorityInstruction(accounts);
    const tx = new Transaction().add(setAuthorityIx);

    await sendAndConfirmTransaction(connection, tx, [payerPair, vaultAuthorityPair]);

    // We can now verify that the vault authority was indeed updated
    const vaultAccountInfo = await connection.getAccountInfo(vault);
    assert(vaultAccountInfo != null);
    const [vaultAccount] = Vault.fromAccountInfo(vaultAccountInfo);
    console.log({ vaultWithUpdatedAuthority: vaultAccount.pretty() });

    // Let's verify that the authority was changed as we expect
    assert(vaultAccount.authority.equals(newAuthority));
  }

  // -----------------
  // 5. Our active vault allows us to Mint Shares to the Treasury since
  //    we initialized it with `allowFurtherShareCreation: true`
  // -----------------
  console.log('5. Mint Fractional Shares');
  // However let's say we try to use the old vault authority and the transaction fails
  {
    const accounts: MintFractionalSharesInstructionAccounts = {
      fractionTreasury,
      fractionMint,
      vault,
      vaultAuthority,
      mintAuthority: fractionMintAuthority,
    };

    const mintSharesIx = mintSharesToTreasury(accounts, 2);
    const tx = new Transaction().add(mintSharesIx);
    try {
      await sendAndConfirmTransaction(connection, tx, [payerPair, vaultAuthorityPair]);
    } catch (err) {
      // We can use `cusper` to resolve a typed error from the error logs
      const cusperError = cusper.errorFromProgramLogs(err.logs);
      console.error('\nCusper Error:\n%s\n', cusperError.stack);
    }
  }
  // Set the vault authority to the updated one and try again ...
  vaultAuthorityPair = newAuthorityPair;
  vaultAuthority = newAuthority;
  {
    const accounts: MintFractionalSharesInstructionAccounts = {
      fractionTreasury,
      fractionMint,
      vault,
      vaultAuthority,
      mintAuthority: fractionMintAuthority,
    };

    const mintSharesIx = mintSharesToTreasury(accounts, 2);
    const tx = new Transaction().add(mintSharesIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [payerPair, vaultAuthorityPair]);

    console.log('... query token balances');
    await TokenBalances.forTransaction(connection, sig, addressLabels).dump(console.log);
  }

  // -----------------
  // 6. Combine Vault
  // -----------------
  console.log('6. Combine Vault');
  {
    const combineSetup: CombineVaultSetup = await CombineVaultSetup.create(connection, {
      vault,
      vaultAuthority,
      fractionMint,
      fractionTreasury,
      redeemTreasury,
      priceMint,
      externalPricing: externalPriceAccount,
    });
    await combineSetup.createOutstandingShares(payerPair.publicKey);
    await combineSetup.createPayment(payerPair.publicKey);
    combineSetup.approveTransfers(payerPair.publicKey);
    combineSetup.assertComplete();

    addressLabels.addLabels(combineSetup);

    const combineIx = await combineVault(combineSetup);
    const tx = new Transaction().add(...combineSetup.instructions).add(combineIx);
    await sendAndConfirmTransaction(connection, tx, [
      payerPair,
      ...combineSetup.signers,
      combineSetup.transferAuthorityPair,
      vaultAuthorityPair,
    ]);
    const vaultAccount = await Vault.fromAccountAddress(connection, vault);
    console.log({ VaultState: vaultAccount.pretty().state });
  }

  // -----------------
  // 7. Withdraw Tokens from Vault and Deactivate it
  // -----------------
  console.log('7. Withdraw Tokens from Vault');
  {
    const [setupDestinationIxs, setupDestinationSigners, { destination }] =
      await setupWithdrawFromSafetyDestinationAccount(connection, {
        payer: payerPair.publicKey,
        mint: safetyDeposit.tokenMint,
      });
    addressLabels.addLabels({ destination });
    const accounts: WithdrawTokenFromSafetyDepositBoxAccounts = {
      destination,
      fractionMint,
      vault,
      vaultAuthority,
      store: safetyDeposit.store,
      safetyDeposit: safetyDeposit.safetyDeposit,
    };
    const withdrawIx = await withdrawTokenFromSafetyDepositBox(accounts, TOKEN_AMOUNT);

    const signers = [payerPair, ...setupDestinationSigners, vaultAuthorityPair];
    const tx = new Transaction().add(...setupDestinationIxs).add(withdrawIx);
    const sig = await sendAndConfirmTransaction(connection, tx, signers);

    console.log('... query token balances');
    await TokenBalances.forTransaction(connection, sig, addressLabels).dump(console.log);

    const vaultAccount = await Vault.fromAccountAddress(connection, vault);
    console.log({ VaultState: vaultAccount.pretty().state });
  }
}

if (module === require.main) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
