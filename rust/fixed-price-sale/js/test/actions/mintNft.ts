import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  defaultSendOptions,
  TransactionHandler,
  assertConfirmedTransaction,
} from '@metaplex-foundation/amman';
import {
  PROGRAM_ID,
  deprecated,
  createCreateMasterEditionV3Instruction,
  Creator,
  DataV2,
  createCreateMetadataAccountV2Instruction,
} from '@metaplex-foundation/mpl-token-metadata';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore createMintToInstruction export actually exist but isn't setup correctly
import { createMintToInstruction } from '@solana/spl-token';
import { strict as assert } from 'assert';

import { createTokenAccount } from '../transactions/createTokenAccount';
import { CreateMint } from './createMintAccount';

type MintNFTParams = {
  transactionHandler: TransactionHandler;
  payer: Keypair;
  connection: Connection;
  maxSupply?: number;
  creators?: Creator[];
  collectionMint?: PublicKey;
};

const URI = 'https://arweave.net/Rmg4pcIv-0FQ7M7X838p2r592Q4NU63Fj7o7XsvBHEE';
const NAME = 'test';
const SYMBOL = 'sym';
const SELLER_FEE_BASIS_POINTS = 10;

export async function mintNFT({
  transactionHandler,
  payer,
  connection,
  creators,
  collectionMint,
  maxSupply = 100,
}: MintNFTParams) {
  const { mint, createMintTx } = await CreateMint.createMintAccount(connection, payer.publicKey);
  const mintRes = await transactionHandler.sendAndConfirmTransaction(
    createMintTx,
    [mint],
    defaultSendOptions,
  );
  assertConfirmedTransaction(assert, mintRes.txConfirmed);

  const { tokenAccount, createTokenTx } = await createTokenAccount({
    payer: payer.publicKey,
    mint: mint.publicKey,
    connection,
  });

  createTokenTx.add(
    createMintToInstruction(mint.publicKey, tokenAccount.publicKey, payer.publicKey, 1),
  );

  const data: DataV2 = {
    uri: URI,
    name: NAME,
    symbol: SYMBOL,
    sellerFeeBasisPoints: SELLER_FEE_BASIS_POINTS,
    creators: creators ?? null,
    collection: collectionMint
      ? {
          key: collectionMint,
          verified: false,
        }
      : null,
    uses: null,
  };

  const metadata = await deprecated.Metadata.getPDA(mint.publicKey);

  const createMetadataInstruction = createCreateMetadataAccountV2Instruction(
    {
      metadata,
      mint: mint.publicKey,
      updateAuthority: payer.publicKey,
      mintAuthority: payer.publicKey,
      payer: payer.publicKey,
    },
    { createMetadataAccountArgsV2: { isMutable: true, data } },
  );

  createTokenTx.add(createMetadataInstruction);

  const [edition, editionBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from(deprecated.MetadataProgram.PREFIX),
      PROGRAM_ID.toBuffer(),
      new PublicKey(mint.publicKey).toBuffer(),
      Buffer.from(deprecated.MasterEdition.EDITION_PREFIX),
    ],
    PROGRAM_ID,
  );

  const masterEditionInstruction = createCreateMasterEditionV3Instruction(
    {
      edition,
      metadata,
      updateAuthority: payer.publicKey,
      mint: mint.publicKey,
      mintAuthority: payer.publicKey,
      payer: payer.publicKey,
    },
    {
      createMasterEditionArgs: { maxSupply },
    },
  );

  createTokenTx.add(masterEditionInstruction);

  const res = await transactionHandler.sendAndConfirmTransaction(
    createTokenTx,
    [tokenAccount],
    defaultSendOptions,
  );
  assertConfirmedTransaction(assert, res.txConfirmed);

  return { tokenAccount, edition, editionBump, mint, metadata };
}
