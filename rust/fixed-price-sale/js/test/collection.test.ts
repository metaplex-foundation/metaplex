import test from 'tape';

import { killStuckProcess } from './utils';
import { createPrerequisites, mintNFT } from './actions';
import { verifyCollection } from './actions/verifyCollection';

killStuckProcess();

test('buy: successful purchase for newly minted treasury mint', async (t) => {
  const { payer, connection, transactionHandler } = await createPrerequisites();

  const {
    mint: collectionMint,
    metadata: collectionMetadata,
    edition: collectionMasterEditionAccount,
  } = await mintNFT({
    transactionHandler,
    payer,
    connection,
    maxSupply: 0,
  });
  const { metadata: userCollectionMetadata } = await mintNFT({
    transactionHandler,
    payer,
    connection,
    collectionMint: collectionMint.publicKey,
  });

  await verifyCollection({
    transactionHandler,
    connection,
    payer,
    metadata: userCollectionMetadata,
    collectionAuthority: payer.publicKey,
    collection: collectionMetadata,
    collectionMint: collectionMint.publicKey,
    collectionMasterEditionAccount,
  });
});
