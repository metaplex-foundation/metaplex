import { sendTransactionWithRetryWithKeypair } from '../helpers/transactions';
import {
  getTokenWallet,
  getMetadata,
  getMasterEdition,
} from '../helpers/accounts';
import * as anchor from '@project-serum/anchor';
import fetch from 'node-fetch';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MintLayout,
  Token,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Keypair,
  Connection,
  SystemProgram,
  TransactionInstruction,
  PublicKey,
} from '@solana/web3.js';
import log from 'loglevel';
import {
  DataV2,
  Collection,
  Uses,
  VerifyCollection,
  Creator,
  CreateMetadataV2,
  CreateMasterEditionV3,
  UpdateMetadataV2,
  SetAndVerifyCollectionCollection,
} from '@metaplex-foundation/mpl-token-metadata';
import PromisePool from '@supercharge/promise-pool/dist';
import * as cliProgress from 'cli-progress';
import { sleep } from '../helpers/various';

export const createMetadata = async (
  metadataLink: string,
  verifyCreators: boolean,
  collection?: PublicKey,
  uses?: Uses,
): Promise<DataV2 | undefined> => {
  // Metadata
  let metadata;
  try {
    metadata = await (await fetch(metadataLink, { method: 'GET' })).json();
  } catch (e) {
    log.debug(e);
    log.error('Invalid metadata at', metadataLink);
    return;
  }

  return validateMetadata({
    metadata,
    uri: metadataLink,
    verifyCreators,
    collection,
    uses,
  });
};
// Validate metadata
export const validateMetadata = ({
  metadata,
  uri,
  verifyCreators = true,
  collection,
  uses,
}: {
  metadata: any;
  uri: string;
  verifyCreators?: boolean;
  collection?: PublicKey;
  uses?: Uses;
}): DataV2 | undefined => {
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
        verified: verifyCreators ? true : false,
      }),
  );
  return new DataV2({
    symbol: metadata.symbol,
    name: metadata.name,
    uri,
    sellerFeeBasisPoints: metadata.seller_fee_basis_points,
    creators: creators,
    collection: collection
      ? new Collection({ key: collection.toBase58(), verified: false })
      : null,
    uses,
  });
};

export const createMetadataAccount = async ({
  connection,
  data,
  mintKey,
  walletKeypair,
}: {
  connection: Connection;
  data: DataV2;
  mintKey: PublicKey;
  walletKeypair: Keypair;
}): Promise<PublicKey | void> => {
  // Retrieve metadata
  const metadataAccount = await getMetadata(mintKey);
  const signers: anchor.web3.Keypair[] = [];
  const wallet = new anchor.Wallet(walletKeypair);
  if (!wallet?.publicKey) return;

  const instructions = new CreateMetadataV2(
    { feePayer: wallet.publicKey },
    {
      metadata: metadataAccount,
      metadataData: data,
      updateAuthority: wallet.publicKey,
      mint: mintKey,
      mintAuthority: wallet.publicKey,
    },
  ).instructions;

  // Execute transaction
  const txid = await sendTransactionWithRetryWithKeypair(
    connection,
    walletKeypair,
    instructions,
    signers,
  );
  console.log('Metadata created', txid);
  return metadataAccount;
};

export type MintResult = {
  metadataAccount: PublicKey;
  mint: PublicKey;
};

export const mintNFT = async (
  connection: Connection,
  walletKeypair: Keypair,
  metadataLink: string,
  mutableMetadata: boolean = true,
  collection: PublicKey = null,
  maxSupply: number = 0,
  verifyCreators: boolean,
  use: Uses = null,
  receivingWallet: PublicKey = null,
): Promise<MintResult | void> => {
  // Retrieve metadata
  const data = await createMetadata(
    metadataLink,
    verifyCreators,
    collection,
    use,
  );
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
    Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      userTokenAccoutAddress,
      wallet.publicKey,
      wallet.publicKey,
    ),
  );

  // Create metadata
  const metadataAccount = await getMetadata(mint.publicKey);

  instructions.push(
    ...new CreateMetadataV2(
      { feePayer: wallet.publicKey },
      {
        metadata: metadataAccount,
        metadataData: data,
        updateAuthority: wallet.publicKey,
        mint: mint.publicKey,
        mintAuthority: wallet.publicKey,
      },
    ).instructions,
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

  instructions.push(
    ...new CreateMasterEditionV3(
      {
        feePayer: wallet.publicKey,
      },
      {
        edition: editionAccount,
        metadata: metadataAccount,
        mint: mint.publicKey,
        mintAuthority: wallet.publicKey,
        updateAuthority: wallet.publicKey,
        maxSupply: new anchor.BN(maxSupply),
      },
    ).instructions,
  );

  if (!mutableMetadata) {
    instructions.push(
      ...new UpdateMetadataV2(
        {},
        {
          metadata: metadataAccount,
          metadataData: data,
          updateAuthority: walletKeypair.publicKey,
          primarySaleHappened: null,
          isMutable: false,
        },
      ).instructions,
    );
  }

  if (receivingWallet) {
    const derivedAccount = await getTokenWallet(
      receivingWallet,
      mint.publicKey,
    );
    const createdAccountIx = Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      derivedAccount,
      receivingWallet,
      wallet.publicKey,
    );
    const transferIx = Token.createTransferInstruction(
      TOKEN_PROGRAM_ID,
      userTokenAccoutAddress,
      derivedAccount,
      wallet.publicKey,
      signers,
      1,
    );
    const closeAccountIx = Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      userTokenAccoutAddress,
      wallet.publicKey,
      wallet.publicKey,
      signers,
    );
    instructions.push(createdAccountIx, transferIx, closeAccountIx);
  }

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
  await connection.getParsedTransaction(res.txid, 'confirmed');

  log.info('NFT created', res.txid);
  log.info('\nNFT: Mint Address is ', mint.publicKey.toBase58());
  log.info('NFT: Metadata address is ', metadataAccount.toBase58());
  return { metadataAccount, mint: mint.publicKey };
};

export const updateMetadata = async (
  mintKey: PublicKey,
  connection: Connection,
  walletKeypair: Keypair,
  metadataLink: string,
  collection: PublicKey = null,
  verifyCreators: boolean,
  uses: Uses,
): Promise<PublicKey | void> => {
  // Retrieve metadata
  const data = await createMetadata(
    metadataLink,
    verifyCreators,
    collection,
    uses,
  );
  if (!data) return;

  const metadataAccount = await getMetadata(mintKey);
  const signers: anchor.web3.Keypair[] = [];

  const instructions = new UpdateMetadataV2(
    {},
    {
      metadata: metadataAccount,
      metadataData: data,
      updateAuthority: walletKeypair.publicKey,
      primarySaleHappened: null,
      isMutable: null,
    },
  ).instructions;

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

export const setAndVerifyCollection = async (
  mintKey: PublicKey,
  connection: Connection,
  walletKeypair: Keypair,
  collectionMint: PublicKey,
) => {
  const metadataAccount = await getMetadata(mintKey);
  const collectionMetadataAccount = await getMetadata(collectionMint);
  const collectionMasterEdition = await getMasterEdition(collectionMint);
  const signers: anchor.web3.Keypair[] = [walletKeypair];
  const tx = new SetAndVerifyCollectionCollection(
    { feePayer: walletKeypair.publicKey },
    {
      updateAuthority: walletKeypair.publicKey,
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

export const setAndVerifyCollectionAll = async (
  hashlist: string[],
  connection: Connection,
  walletKeyPair: Keypair,
  collectionMint: PublicKey,
  rateLimit?: number,
) => {
  const progressBar = new cliProgress.SingleBar(
    {
      format: 'Progress: [{bar}] {percentage}% | {value}/{total}',
    },
    cliProgress.Presets.shades_classic,
  );
  progressBar.start(hashlist.length, 0);

  await PromisePool.withConcurrency(rateLimit || 10)
    .for(hashlist)
    .handleError(async (err, mint) => {
      log.error(
        `\nFailed in set and verify collection for ${mint}: ${err.message}`,
      );
      await sleep(5000);
    })
    .process(async mint => {
      try {
        const mintKey = new PublicKey(mint);
        await setAndVerifyCollection(
          mintKey,
          connection,
          walletKeyPair,
          collectionMint,
        );
      } finally {
        progressBar.increment();
      }
    });
  progressBar.stop();
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
