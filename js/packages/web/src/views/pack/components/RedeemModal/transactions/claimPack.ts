import { Keypair, TransactionInstruction } from '@solana/web3.js';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { claimPack } from '@oyster/common/dist/lib/models/packs/instructions/claimPack';

import { RedeemPackParams } from './interface';
import { getNewMint } from './getNewMint';
import {
  sendTransactions,
  SequenceType,
  StringPublicKey,
  toPublicKey,
} from '@oyster/common';

export const generateClaimPackInstructions = async ({
  wallet,
  connection,
  index,
  packSetKey,
  voucherToken,
  userToken,
  voucherMint,
  metadataMint,
  edition,
}: RedeemPackParams): Promise<{
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
  newMint: StringPublicKey;
}> => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const walletPublicKey = wallet.publicKey;

  const {
    mint: newMint,
    instructions: newMintInstructions,
    signers: newMintSigners,
  } = await getNewMint(wallet, connection);

  const claimPackInstruction = await claimPack({
    index,
    packSetKey: toPublicKey(packSetKey),
    wallet: walletPublicKey,
    userToken,
    voucherToken,
    voucherMint,
    newMint,
    metadataMint,
    edition,
  });

  return {
    instructions: [newMintInstructions, [claimPackInstruction]],
    signers: [newMintSigners, []],
    newMint,
  };
};

export const sendClaimPack = async ({
  wallet,
  connection,
  index,
  packSetKey,
  voucherToken,
  userToken,
  voucherMint,
  metadataMint,
  edition,
}: RedeemPackParams): Promise<StringPublicKey> => {
  const { instructions, signers, newMint } =
    await generateClaimPackInstructions({
      wallet,
      connection,
      index,
      packSetKey,
      voucherToken,
      userToken,
      voucherMint,
      metadataMint,
      edition,
    });

  await sendTransactions(
    connection,
    wallet,
    instructions,
    signers,
    SequenceType.Sequential,
  );

  return newMint;
};
