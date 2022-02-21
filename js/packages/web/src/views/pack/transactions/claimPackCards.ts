import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import {
  claimPack,
  findPackCardProgramAddress,
  sendTransactionsInChunks,
  SequenceType,
  toPublicKey,
} from '@oyster/common';
import { BN } from 'bn.js';

import {
  ClaimPackCardsParams,
  ClaimSeveralCardsByIndexParams,
  GenerateClaimPackInstructionsParams,
  GenerateTransactionsResponse,
} from './interface';
import { getNewMint } from './getNewMint';

export const claimPackCards = async ({
  connection,
  wallet,
  ...params
}: ClaimPackCardsParams) => {
  const instructions = await getClaimPackCardsInstructions({
    connection,
    wallet,
    ...params,
  });

  const flatInstructions = instructions.flat();

  await sendTransactionsInChunks(
    connection,
    wallet,
    flatInstructions.map(({ instructions }) => instructions),
    flatInstructions.map(({ signers }) => signers),
    SequenceType.Sequential,
    'singleGossip',
    120000,
    20,
  );
};

const getClaimPackCardsInstructions = async ({
  cardsToRedeem,
  ...params
}: ClaimPackCardsParams): Promise<GenerateTransactionsResponse[][]> =>
  Promise.all(
    Array.from(cardsToRedeem.entries(), ([index, numberOfCards]) =>
      claimSeveralCardsByIndex({
        numberOfCards,
        index,
        ...params,
      }),
    ),
  );

const claimSeveralCardsByIndex = async ({
  wallet,
  connection,
  pack,
  numberOfCards,
  voucherMint,
  index,
  metadataByPackCard,
  packCards,
  masterEditions,
}: ClaimSeveralCardsByIndexParams): Promise<GenerateTransactionsResponse[]> => {
  const packSetKey = pack.pubkey;

  const packCardToRedeem = await findPackCardProgramAddress(
    toPublicKey(packSetKey),
    index,
  );

  const packCardMetadata = metadataByPackCard[packCardToRedeem];
  const userToken = packCards[packCardToRedeem]?.info?.tokenAccount;

  if (!packCardMetadata?.info?.masterEdition) {
    throw new Error('Missing master edition');
  }
  if (!userToken) {
    throw new Error('Missing user token');
  }

  const packCardEdition = masterEditions[packCardMetadata.info.masterEdition];

  return Promise.all(
    Array.from({ length: numberOfCards }).map((_, i) => {
      const packCardEditionIndex =
        packCardEdition.info.supply.toNumber() + i + 1;

      return generateClaimPackInstructions({
        wallet,
        connection,
        index,
        packSetKey,
        userToken,
        voucherMint,
        metadataMint: packCardMetadata.info.mint,
        edition: new BN(packCardEditionIndex),
      });
    }),
  );
};

const generateClaimPackInstructions = async ({
  wallet,
  connection,
  index,
  packSetKey,
  userToken,
  voucherMint,
  metadataMint,
  edition,
}: GenerateClaimPackInstructionsParams): Promise<GenerateTransactionsResponse> => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const walletPublicKey = wallet.publicKey;

  const {
    mint: newMint,
    instructions: newMintInstructions,
    signers: newMintSigners,
  } = await getNewMint(wallet, connection);

  const claimPackInstruction = await claimPack({
    index,
    packSetKey,
    wallet: walletPublicKey,
    userToken,
    voucherMint,
    newMint,
    metadataMint,
    edition,
  });

  return {
    instructions: [...newMintInstructions, claimPackInstruction],
    signers: newMintSigners,
  };
};
