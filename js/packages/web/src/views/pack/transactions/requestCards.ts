import {
  sendTransactions,
  SequenceType,
  toPublicKey,
  requestCardToRedeem,
  cleanUp,
  chunks,
} from '@oyster/common';

import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { TransactionInstruction } from '@solana/web3.js';

import {
  RequestCardsParams,
  RequestCardsInstructionsParams,
  RequestCardParams,
} from './interface';

const REQUEST_CARDS_CHUNK_SIZE = 46;

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
    randomOracle: pack.info.randomOracle,
  });

  const requestCardsInstructionsChunks = chunks(
    requestCardsInstructions.flat(),
    REQUEST_CARDS_CHUNK_SIZE,
  );
  const requestCardsInstructionsSigners = requestCardsInstructionsChunks.map(
    () => [],
  );

  return sendTransactions(
    connection,
    wallet,
    requestCardsInstructionsChunks,
    requestCardsInstructionsSigners,
    SequenceType.Sequential,
  );
};

const getRequestCardsInstructions = async ({
  cardsLeftToOpen,
  ...params
}: RequestCardsInstructionsParams): Promise<TransactionInstruction[][]> => {
  const addCardsToPack = Array.from({ length: cardsLeftToOpen }).map(() =>
    generateRequestCardInstructions({
      index: 1, // voucher index, currently we have only one
      ...params,
    }),
  );

  return Promise.all(addCardsToPack);
};

const generateRequestCardInstructions = async ({
  index,
  packSetKey,
  wallet,
  ...params
}: RequestCardParams): Promise<TransactionInstruction[]> => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const cleanUpInstruction = await cleanUp(toPublicKey(packSetKey));

  const claimPackInstruction = await requestCardToRedeem({
    index,
    packSetKey: toPublicKey(packSetKey),
    wallet: wallet.publicKey,
    ...params,
  });

  return [cleanUpInstruction, claimPackInstruction];
};
