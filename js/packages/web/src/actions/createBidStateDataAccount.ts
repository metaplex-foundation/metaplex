import {
  Keypair,
  Connection,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import {
  utils,
  StringPublicKey,
  toPublicKey,
  WalletSigner,
} from '@oyster/common';

const MIN_BID_STATE_DATA_ACCOUNT_SIZE: number = 32 + 24;
const BID_SIZE: number = 32 + 8;

// This command creates the bid state data account
export async function createBidStateDataAccount(
  connection: Connection,
  wallet: WalletSigner,
  bids: number,
): Promise<{
  bidStateDataAccount: StringPublicKey;
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const PROGRAM_IDS = utils.programIds();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  const actualBidStateDataAccountSize =
    MIN_BID_STATE_DATA_ACCOUNT_SIZE + BID_SIZE * (bids * 2);

  const bsdaRentExempt = await connection.getMinimumBalanceForRentExemption(
    actualBidStateDataAccountSize,
  );

  const bidStateDataAccount = Keypair.generate();
  const key = bidStateDataAccount.publicKey.toBase58();

  const uninitializedBSDA = SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: bidStateDataAccount.publicKey,
    lamports: bsdaRentExempt,
    space: actualBidStateDataAccountSize,
    programId: toPublicKey(PROGRAM_IDS.auction),
  });
  instructions.push(uninitializedBSDA);
  signers.push(bidStateDataAccount);

  return {
    bidStateDataAccount: key,
    instructions,
    signers,
  };
}
