import { Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { requestCardToRedeem } from '@oyster/common/dist/lib/models/packs/instructions/requestCardToRedeem';
import { sendTransactions, SequenceType, toPublicKey } from '@oyster/common';

import { RequestCardParams } from './interface';

export const generateRequestCardInstructions = async ({
  index,
  packSetKey,
  edition,
  editionMint,
  tokenAccount,
  packVoucher,
  wallet,
}: RequestCardParams): Promise<{
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
}> => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const claimPackInstruction = await requestCardToRedeem({
    index,
    packSetKey: toPublicKey(packSetKey),
    edition,
    editionMint,
    tokenAccount,
    packVoucher,
    wallet: wallet.publicKey.toString(),
  });

  return {
    instructions: [[claimPackInstruction]],
    signers: [[]],
  };
};

export const sendRequestCard = async ({
  connection,
  index,
  packSetKey,
  edition,
  editionMint,
  tokenAccount,
  packVoucher,
  wallet,
}: RequestCardParams & { connection: Connection }) => {
  const { instructions, signers } = await generateRequestCardInstructions({
    index,
    packSetKey,
    edition,
    editionMint,
    tokenAccount,
    packVoucher,
    wallet,
  });

  return sendTransactions(
    connection,
    wallet,
    instructions,
    signers,
    SequenceType.Sequential,
  );
};
