import test from 'tape';
import {
  assertConfirmedTransaction,
  defaultSendOptions,
  PayerTransactionHandler,
} from '@metaplex-foundation/amman';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Creator } from '@metaplex-foundation/mpl-token-metadata';

import { findVaultOwnerAddress } from '../../src/utils';

import { createAndSignTransaction, logDebug } from '../utils';
import { createTokenAccount } from '../transactions/createTokenAccount';
import { mintNFT } from './mintNft';
import { createInitSellingResourceInstruction } from '../../src/generated/instructions';
import { createSavePrimaryMetadataCreators } from '../transactions';

type InitSellingResourceParams = {
  test: test.Test;
  transactionHandler: PayerTransactionHandler;
  payer: Keypair;
  connection: Connection;
  store: PublicKey;
  maxSupply: number | null;
};

export const initSellingResource = async ({
  test,
  transactionHandler,
  payer,
  connection,
  store,
  maxSupply,
}: InitSellingResourceParams): Promise<{
  sellingResource: Keypair;
  vault: Keypair;
  vaultOwner: PublicKey;
  vaultOwnerBump: number;
  resourceMint: Keypair;
  metadata: PublicKey;
  primaryMetadataCreators: PublicKey;
}> => {
  const secondaryCreator: Creator = {
    address: payer.publicKey,
    share: 100,
    verified: true,
  };

  const {
    edition: masterEdition,
    editionBump: masterEditionBump,
    tokenAccount: resourceToken,
    mint: resourceMint,
    metadata,
  } = await mintNFT({
    transactionHandler,
    payer,
    connection,
    creators: [secondaryCreator],
  });

  const [vaultOwner, vaultOwnerBump] = await findVaultOwnerAddress(resourceMint.publicKey, store);
  const { tokenAccount: vault, createTokenTx } = await createTokenAccount({
    payer: payer.publicKey,
    mint: resourceMint.publicKey,
    connection,
    owner: vaultOwner,
  });
  const createVaultRes = await transactionHandler.sendAndConfirmTransaction(
    createTokenTx,
    [vault],
    defaultSendOptions,
  );
  assertConfirmedTransaction(test, createVaultRes.txConfirmed);

  const sellingResource = Keypair.generate();

  const initSellingResourceInstruction = createInitSellingResourceInstruction(
    {
      store,
      admin: payer.publicKey,
      sellingResource: sellingResource.publicKey,
      sellingResourceOwner: payer.publicKey,
      metadata,
      masterEdition,
      resourceMint: resourceMint.publicKey,
      resourceToken: resourceToken.publicKey,
      vault: vault.publicKey,
      owner: vaultOwner,
    },
    {
      masterEditionBump,
      vaultOwnerBump,
      maxSupply,
    },
  );

  const primaryCreator = {
    address: payer.publicKey,
    share: 100,
    verified: false,
  };

  const { savePrimaryMetadataCreatorsInstruction, primaryMetadataCreators } =
    await createSavePrimaryMetadataCreators({
      transactionHandler,
      payer,
      connection,
      metadata,
      creators: [primaryCreator],
    });

  logDebug(`primary metadata creators ${primaryMetadataCreators}`);

  const initSellingResourceTx = await createAndSignTransaction(
    connection,
    payer,
    [initSellingResourceInstruction, savePrimaryMetadataCreatorsInstruction],
    [sellingResource],
  );

  const initSellingResourceRes = await transactionHandler.sendAndConfirmTransaction(
    initSellingResourceTx,
    [sellingResource],
    defaultSendOptions,
  );

  logDebug(`selling-resource: ${sellingResource.publicKey}`);
  assertConfirmedTransaction(test, initSellingResourceRes.txConfirmed);

  return {
    sellingResource,
    vault,
    vaultOwner,
    vaultOwnerBump,
    resourceMint,
    metadata,
    primaryMetadataCreators,
  };
};
