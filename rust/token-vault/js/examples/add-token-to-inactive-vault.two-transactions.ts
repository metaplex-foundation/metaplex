// -----------------
// Example: creating Safety Deposit instructions and AddTokenToInactiveVault instruction
// and running them in two separate transactions
// -----------------

// Make sure to have a local validator running to try this as is, i.e. via `yarn amman:start`

import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';
import { AddressLabels, LOCALHOST } from '@metaplex-foundation/amman';
import { strict as assert } from 'assert';

import { addressLabels } from '../test/utils';
import {
  Vault,
  SafetyDepositSetup,
  addTokenToInactiveVault,
  SafetyDepositBox,
} from '../src/mpl-token-vault';
import { initVault } from './init-vault';
import { fundedPayer } from './helpers';

// Could be devnet/mainnet, depending on your use case
const host = LOCALHOST;

async function main() {
  console.log('+++++++ Ex: add-token-to-inactive-vault.two-transactions.ts  +++++++');
  const connection = new Connection(host, 'singleGossip');

  const payerPair = await fundedPayer(connection, 5);
  const vaultAuthorityPair = Keypair.generate();

  const accounts = await initVault(
    connection,
    {
      payer: payerPair,
      vaultAuthority: vaultAuthorityPair,
    },
    addressLabels,
  );

  return addTokenToVaultTwoTransactions(
    connection,
    payerPair,
    vaultAuthorityPair,
    accounts.vault,
    addressLabels,
  );
}

export async function addTokenToVaultTwoTransactions(
  connection: Connection,
  payerPair: Keypair,
  vaultAuthorityPair: Keypair,
  vault: PublicKey,
  addressLabels: AddressLabels,
) {
  // We want to mint two tokens and transfer them to the store which will be managed by the vault
  const TOKEN_AMOUNT = 2;

  // -----------------
  // 1. We setup the safety deposit box which will create a token account for us and
  //    mint two tokens to it.
  // -----------------
  const safetyDepositSetup = await SafetyDepositSetup.create(connection, {
    payer: payerPair.publicKey,
    vault,
    mintAmount: TOKEN_AMOUNT,
  });
  addressLabels.addLabels(safetyDepositSetup);

  // -----------------
  // 2. We create the add token instruction providing the safety deposit setup
  // -----------------
  const addTokenIx = await addTokenToInactiveVault(safetyDepositSetup, {
    payer: payerPair.publicKey,
    vaultAuthority: vaultAuthorityPair.publicKey,
  });

  // -----------------
  // 3. We execute a transaction which includes the instructions and signers to
  //    setup the safety deposit box.
  // -----------------
  {
    const tx = new Transaction().add(...safetyDepositSetup.instructions);
    const signers = [payerPair, ...safetyDepositSetup.signers];
    await sendAndConfirmTransaction(connection, tx, signers);
  }

  // -----------------
  // 4. We execute a transaction which includes the instruction and signers to
  //    add the token.
  // -----------------
  {
    const tx = new Transaction().add(addTokenIx);
    const signers = [payerPair, safetyDepositSetup.transferAuthorityPair, vaultAuthorityPair];
    await sendAndConfirmTransaction(connection, tx, signers);
  }

  // -----------------
  // 5. We query the safety deposit to verify that it points to the correct accounts
  // -----------------
  const safetyDepositAccountInfo = await connection.getAccountInfo(
    safetyDepositSetup.safetyDeposit,
  );
  assert(safetyDepositAccountInfo != null);
  const [safetyDepositAccount] = SafetyDepositBox.fromAccountInfo(safetyDepositAccountInfo);
  console.log({ safetyDeposit: safetyDepositAccount.pretty() });

  // -----------------
  // 6. We query the vault and verify that its tokenAccount increased to 1
  //    which denotes that it manages one safety deposit box
  // -----------------
  const vaultAccountInfo = await connection.getAccountInfo(vault);
  assert(vaultAccountInfo != null);
  const [vaultAccount] = Vault.fromAccountInfo(vaultAccountInfo);
  console.log({ vaultWithAddedToken: vaultAccount.pretty() });
}

if (module === require.main) {
  main()
    .then(() => process.exit(0))
    .catch((err: any) => {
      console.error(err);
      process.exit(1);
    });
}
