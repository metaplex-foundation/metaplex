import {
  sendTransactions,
  SequenceType,
  toPublicKey,
  requestCardToRedeem,
  cleanUp,
} from '@oyster/common';

import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { TransactionInstruction } from '@solana/web3.js';

import {
  RequestCardsParams,
  RequestCardsInstructionsParams,
  RequestCardParams,
} from './interface';

export const requestCards = async ({
  userVouchers,
  pack,
  voucherEditionKey,
  tokenAccount,
  connection,
  wallet,
  cardsLeftToOpen,
}: RequestCardsParams): Promise<number> => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const {
    pubkey: packVoucher,
    edition,
    mint: editionMint,
  } = userVouchers[voucherEditionKey];

  const requestCardsInstructions = await getRequestCardsInstructions({
    cardsLeftToOpen,
    edition,
    editionMint,
    tokenAccount,
    packVoucher,
    wallet,
    packSetKey: pack.pubkey,
  });
  // ToDo: Add chunks
  const flatRequestCards = [requestCardsInstructions.flat()];
  const requestCardsInstructionsSigners = flatRequestCards.map(() => []);

  return sendTransactions(
    connection,
    wallet,
    flatRequestCards,
    requestCardsInstructionsSigners,
    SequenceType.Sequential,
  );
};

const getRequestCardsInstructions = async ({
  cardsLeftToOpen,
  packSetKey,
  edition,
  editionMint,
  tokenAccount,
  packVoucher,
  wallet,
}: RequestCardsInstructionsParams): Promise<TransactionInstruction[][]> => {
  const addCardsToPack = Array.from({ length: cardsLeftToOpen }).map(() => {
    return generateRequestCardInstructions({
      index: 1, // voucher index, currently we have only one
      packSetKey,
      edition,
      editionMint,
      tokenAccount,
      packVoucher,
      wallet,
    });
  });

  return Promise.all(addCardsToPack);
};

const generateRequestCardInstructions = async ({
  index,
  packSetKey,
  edition,
  editionMint,
  tokenAccount,
  packVoucher,
  wallet,
}: RequestCardParams): Promise<TransactionInstruction[]> => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const cleanUpInstruction = await cleanUp(toPublicKey(packSetKey));

  const claimPackInstruction = await requestCardToRedeem({
    index,
    packSetKey: toPublicKey(packSetKey),
    edition,
    editionMint,
    tokenAccount,
    packVoucher,
    wallet: wallet.publicKey,
  });

  return [cleanUpInstruction, claimPackInstruction];
};
