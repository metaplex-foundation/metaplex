import {
  sendTransactionsWithRecentBlock,
  toPublicKey,
  requestCardToRedeem,
  cleanUp,
  chunks,
} from '@oyster/common';

import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { Keypair, TransactionInstruction } from '@solana/web3.js';

import {
  RequestCardsParams,
  RequestCardsInstructionsParams,
  RequestCardParams,
} from './interface';

const REQUEST_CARDS_CHUNK_SIZE = 46;

export const requestCards = async ({
  pack,
  tokenAccount,
  connection,
  wallet,
  cardsLeftToOpen,
  voucherKey,
  editionKey,
  editionMint,
}: RequestCardsParams): Promise<number> => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const requestCardsInstructions = await getRequestCardsInstructions({
    cardsLeftToOpen,
    editionKey,
    editionMint,
    tokenAccount,
    voucherKey,
    wallet,
    packSetKey: pack.pubkey,
    randomOracle: pack.info.randomOracle,
  });

  const requestCardsInstructionsChunks = chunks(
    requestCardsInstructions.flat(),
    REQUEST_CARDS_CHUNK_SIZE,
  );
  const requestCardsInstructionsSigners: Keypair[][] =
    requestCardsInstructionsChunks.map(() => []);

  return sendTransactionsWithRecentBlock(
    connection,
    wallet,
    requestCardsInstructionsChunks,
    requestCardsInstructionsSigners,
  );
};

const getRequestCardsInstructions = async ({
  cardsLeftToOpen,
  tokenAccount,
  ...params
}: RequestCardsInstructionsParams): Promise<TransactionInstruction[][]> => {
  const addCardsToPack = Array.from({ length: cardsLeftToOpen }).map(
    (_, index) =>
      generateRequestCardInstructions({
        index: 1, // voucher index, currently we have only one
        ...params,
        ...(index === 0 ? { tokenAccount } : {}), // add token acc only for first instruction
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
