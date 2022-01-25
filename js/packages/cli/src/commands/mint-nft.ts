import {
  createAssociatedTokenAccountInstruction,
  createMetadataInstruction,
  createMasterEditionInstruction,
  createUpdateMetadataInstruction,
} from '../helpers/instructions';
import { sendTransactionWithRetryWithKeypair } from '../helpers/transactions';
import {
  getTokenWallet,
  getMetadata,
  getMasterEdition,
} from '../helpers/accounts';
import * as anchor from '@project-serum/anchor';
import { Creator, METADATA_SCHEMA } from '../helpers/schema';
import { serialize } from 'borsh';
import { TOKEN_PROGRAM_ID } from '../helpers/constants';
import fetch from 'node-fetch';
import { MintLayout, Token } from '@solana/spl-token';
import {
  Keypair,
  Connection,
  SystemProgram,
  TransactionInstruction,
  PublicKey,
} from '@solana/web3.js';
import log from 'loglevel';
import {
  CreateMetadataV2Args,
  UpdateMetadataV2Args,
  CreateMasterEditionV3Args,
  DataV2,
  Collection,
  Uses,
  VerifyCollection,
} from '@metaplex-foundation/mpl-token-metadata';

export const createMetadata = async (
  metadataLink: string,
  collection: PublicKey,
  uses?: Uses,
): Promise<DataV2> => {
  // Metadata
  let metadata;
  try {
    metadata = await (await fetch(metadataLink, { method: 'GET' })).json();
  } catch (e) {
    log.debug(e);
    log.error('Invalid metadata at', metadataLink);
    return;
  }

  // Validate metadata
  if (
    !metadata.name ||
    !metadata.image ||
    isNaN(metadata.seller_fee_basis_points) ||
    !metadata.properties ||
    !Array.isArray(metadata.properties.creators)
  ) {
    log.error('Invalid metadata file', metadata);
    return;
  }

  // Validate creators
  const metaCreators = metadata.properties.creators;
  if (
    metaCreators.some(creator => !creator.address) ||
    metaCreators.reduce((sum, creator) => creator.share + sum, 0) !== 100
  ) {
    return;
  }

  const creators = metaCreators.map(
    creator =>
      new Creator({
        address: creator.address,
        share: creator.share,
        verified: 1,
      }),
  );
  return new DataV2({
    symbol: metadata.symbol,
    name: metadata.name,
    uri: metadataLink,
    sellerFeeBasisPoints: metadata.seller_fee_basis_points,
    creators: creators,
    collection: collection
      ? new Collection({ key: collection.toBase58(), verified: false })
      : null,
    uses,
  });
};

export const mintNFT = async (
  connection: Connection,
  walletKeypair: Keypair,
  metadataLink: string,
  mutableMetadata: boolean = true,
  collection: PublicKey = null,
  use: Uses = null,
): Promise<PublicKey | void> => {
  // Retrieve metadata
  const data = await createMetadata(metadataLink, collection, use);
  if (!data) return;

  // Create wallet from keypair
  const wallet = new anchor.Wallet(walletKeypair);
  if (!wallet?.publicKey) return;

  // Allocate memory for the account
  const mintRent = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );

  // Generate a mint
  const mint = anchor.web3.Keypair.generate();
  const instructions: TransactionInstruction[] = [];
  const signers: anchor.web3.Keypair[] = [mint, walletKeypair];

  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mint.publicKey,
      lamports: mintRent,
      space: MintLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }),
  );
  instructions.push(
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      0,
      wallet.publicKey,
      wallet.publicKey,
    ),
  );

  const userTokenAccoutAddress = await getTokenWallet(
    wallet.publicKey,
    mint.publicKey,
  );
  instructions.push(
    createAssociatedTokenAccountInstruction(
      userTokenAccoutAddress,
      wallet.publicKey,
      wallet.publicKey,
      mint.publicKey,
    ),
  );

  // Create metadata
  const metadataAccount = await getMetadata(mint.publicKey);
  let txnData = Buffer.from(
    serialize(
      new Map([
        DataV2.SCHEMA,
        ...METADATA_SCHEMA,
        ...CreateMetadataV2Args.SCHEMA,
      ]),
      new CreateMetadataV2Args({ data, isMutable: mutableMetadata }),
    ),
  );

  instructions.push(
    createMetadataInstruction(
      metadataAccount,
      mint.publicKey,
      wallet.publicKey,
      wallet.publicKey,
      wallet.publicKey,
      txnData,
    ),
  );

  instructions.push(
    Token.createMintToInstruction(
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      userTokenAccoutAddress,
      wallet.publicKey,
      [],
      1,
    ),
  );

  // Create master edition
  const editionAccount = await getMasterEdition(mint.publicKey);
  txnData = Buffer.from(
    serialize(
      new Map([
        DataV2.SCHEMA,
        ...METADATA_SCHEMA,
        ...CreateMasterEditionV3Args.SCHEMA,
      ]),
      new CreateMasterEditionV3Args({ maxSupply: new anchor.BN(0) }),
    ),
  );

  instructions.push(
    createMasterEditionInstruction(
      metadataAccount,
      editionAccount,
      mint.publicKey,
      wallet.publicKey,
      wallet.publicKey,
      wallet.publicKey,
      txnData,
    ),
  );

  const res = await sendTransactionWithRetryWithKeypair(
    connection,
    walletKeypair,
    instructions,
    signers,
  );

  try {
    await connection.confirmTransaction(res.txid, 'max');
  } catch {
    // ignore
  }

  // Force wait for max confirmations
  await connection.getParsedConfirmedTransaction(res.txid, 'confirmed');
  log.info('NFT created', res.txid);
  log.info('\n\nNFT: Mint Address is ', mint.publicKey.toBase58());
  return metadataAccount;
};

export const updateMetadata = async (
  mintKey: PublicKey,
  connection: Connection,
  walletKeypair: Keypair,
  metadataLink: string,
  collection: PublicKey = null,
  uses: Uses,
): Promise<PublicKey | void> => {
  // Retrieve metadata
  const data = await createMetadata(metadataLink, collection, uses);
  if (!data) return;

  const metadataAccount = await getMetadata(mintKey);
  const signers: anchor.web3.Keypair[] = [];
  const value = new UpdateMetadataV2Args({
    data,
    updateAuthority: walletKeypair.publicKey.toBase58(),
    primarySaleHappened: null,
    isMutable: true,
  });
  const txnData = Buffer.from(serialize(METADATA_SCHEMA, value));

  const instructions = [
    createUpdateMetadataInstruction(
      metadataAccount,
      walletKeypair.publicKey,
      txnData,
    ),
  ];

  // Execute transaction
  const txid = await sendTransactionWithRetryWithKeypair(
    connection,
    walletKeypair,
    instructions,
    signers,
  );
  console.log('Metadata updated', txid);
  log.info('\n\nUpdated NFT: Mint Address is ', mintKey.toBase58());
  return metadataAccount;
};

export const verifyCollection = async (
  mintKey: PublicKey,
  connection: Connection,
  walletKeypair: Keypair,
  collectionMint: PublicKey,
) => {
  const metadataAccount = await getMetadata(mintKey);
  const collectionMetadataAccount = await getMetadata(collectionMint);
  const collectionMasterEdition = await getMasterEdition(collectionMint);
  const signers: anchor.web3.Keypair[] = [walletKeypair];
  const tx = new VerifyCollection(
    { feePayer: walletKeypair.publicKey },
    {
      metadata: metadataAccount,
      collectionAuthority: walletKeypair.publicKey,
      collectionMint: collectionMint,
      collectionMetadata: collectionMetadataAccount,
      collectionMasterEdition: collectionMasterEdition,
    },
  );
  const txid = await sendTransactionWithRetryWithKeypair(
    connection,
    walletKeypair,
    tx.instructions,
    signers,
  );
  return txid;
};
