import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import { utils, sendTransactionWithRetry } from '@oyster/common';

import { Token } from '@solana/spl-token';
// When you are an artist and you receive royalties, due to the design of the system
// it is to a permanent ATA WSOL account. This is because the auctioneer can't transfer monies
// from your WSOL to your SOL wallet since you own both, and having the auctioneer temporarily
// own your WSOL account to the transfer is one hell of a security vulnerability for a little convenience.
// Instead we make the WSOL permanent, and you have to accept it on the UI via your "unsettled funds"
// notification. All we do is then transfer the lamports out of the account.
export async function closePersonalEscrow(
  connection: Connection,
  wallet: any,
  ata: PublicKey,
) {
  const PROGRAM_IDS = utils.programIds();

  let signers: Keypair[] = [];

  let instructions: TransactionInstruction[] = [
    Token.createCloseAccountInstruction(
      PROGRAM_IDS.token,
      ata,
      wallet.publicKey,
      wallet.publicKey,
      [],
    ),
  ];

  await sendTransactionWithRetry(
    connection,
    wallet,
    instructions,
    signers,
    'single',
  );
}
