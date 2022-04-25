import { PayerTransactionHandler } from '@metaplex-foundation/amman';
import { Connection, Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';

import {
  Creator,
  findPrimaryMetadataCreatorsAddress,
  createSavePrimaryMetadataCreatorsInstruction,
} from '../../src';

type CreateSecondaryMetadataCreatorsParams = {
  transactionHandler: PayerTransactionHandler;
  payer: Keypair;
  connection: Connection;
  metadata: PublicKey;
  creators: Creator[];
};

export const createSavePrimaryMetadataCreators = async ({
  payer,
  metadata,
  creators,
}: CreateSecondaryMetadataCreatorsParams): Promise<{
  savePrimaryMetadataCreatorsInstruction: TransactionInstruction;
  primaryMetadataCreators: PublicKey;
}> => {
  const [primaryMetadataCreators, primaryMetadataCreatorsBump] =
    await findPrimaryMetadataCreatorsAddress(metadata);

  const savePrimaryMetadataCreatorsInstruction = createSavePrimaryMetadataCreatorsInstruction(
    {
      admin: payer.publicKey,
      metadata,
      primaryMetadataCreators,
    },
    {
      primaryMetadataCreatorsBump,
      creators,
    },
  );

  return { savePrimaryMetadataCreatorsInstruction, primaryMetadataCreators };
};
