import {
  createAssociatedTokenAccountInstruction,
  createMint,
  createMetadata,
  programIds,
  notify,
  ENV,
  updateMetadata,
  createMasterEdition,
  sendTransactionWithRetry,
  Data,
  Creator,
  findProgramAddress,
  StringPublicKey,
  toPublicKey,
  WalletSigner,
  Attribute,
} from '@oyster/common';
import React, { Dispatch, SetStateAction } from 'react';
import { MintLayout, Token } from '@solana/spl-token';
import {
  Keypair,
  Connection,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import crypto from 'crypto';
import { getAssetCostToStore } from '../utils/assets';
import { AR_SOL_HOLDER_ID } from '../utils/ids';
import BN from 'bn.js';

const RESERVED_TXN_MANIFEST = 'manifest.json';
const RESERVED_METADATA = 'metadata.json';

interface IArweaveResult {
  error?: string;
  messages?: Array<{
    filename: string;
    status: 'success' | 'fail';
    transactionId?: string;
    error?: string;
  }>;
}

const uploadToArweave = async (data: FormData): Promise<IArweaveResult> => {
  const resp = await fetch(
    'https://us-central1-principal-lane-200702.cloudfunctions.net/uploadFile4',
    {
      method: 'POST',
      // @ts-ignore
      body: data,
    },
  );

  if (!resp.ok) {
    return Promise.reject(
      new Error(
        'Unable to upload the artwork to Arweave. Please wait and then try again.',
      ),
    );
  }

  const result: IArweaveResult = await resp.json();

  const errors = (result.messages || []).reduce((memo: string[], upload) => {
    if (upload.status === "fail" && upload.error) {
      memo = [...memo, upload.error];
    }

    return memo;
  }, [])

  if (errors.length > 0) {
    return Promise.reject(new Error(`The file or metadata failed to upload to Arewave: ${errors.join(", ")}`));
  }

  return result;
};

const nftStorageHolaplexEndpoint = "https://www.holaplex.com/api/ipfs/upload"
export type PinFileResponse = {
  uri?: string;
  name?: string;
  type?: string;
  error?: string;
}

export const mintNFT = async (
  connection: Connection,
  wallet: WalletSigner | undefined,
  env: ENV,
  files: File[],
  metadata: {
    name: string;
    symbol: string;
    description: string;
    image: string | undefined;
    animation_url: string | undefined;
    attributes: Attribute[] | undefined;
    external_url: string;
    properties: any;
    creators: Creator[] | null;
    sellerFeeBasisPoints: number;
  },
  progressCallback: Dispatch<SetStateAction<number>>,
  maxSupply?: number,
  coverFile?: File,
  mainFile?: File,
): Promise<{
  metadataAccount: StringPublicKey;
} | void> => {
  if (!wallet?.publicKey) return;

  const metadataContent = {
    name: metadata.name,
    symbol: metadata.symbol,
    description: metadata.description,
    seller_fee_basis_points: metadata.sellerFeeBasisPoints,
    image: metadata.image,
    animation_url: metadata.animation_url,
    attributes: metadata.attributes,
    external_url: metadata.external_url,
    properties: {
      ...metadata.properties,
      creators: metadata.creators?.map(creator => {
        return {
          address: creator.address,
          share: creator.share,
        };
      }),
    },
  };

  const realFiles: File[] = [...files]
  const fileDataForm = new FormData();

  realFiles.map((f) => {
    fileDataForm.append(
      `file[${f.name}]`,
      f,
      f.name
    )
  });

  const uploadResponse = await fetch(
    nftStorageHolaplexEndpoint,
    {
      mode: "cors",
      method: "POST",
      body: fileDataForm,
    })

  if (!uploadResponse.ok) {
    throw new Error("Unable to upload files to IPFS. Please wait a moment and try again.")
  }

  const uploadedFilePins: { files: PinFileResponse[] } = await uploadResponse.json()
  // add files to properties
  // first image is added as image

  progressCallback(1)
  let imageSet = false;
  metadataContent.properties.files = []
  uploadedFilePins.files.forEach((file) => {
    if (!coverFile && !imageSet && /image/.test(file.type || '')) {
      metadataContent.image = file.uri
      imageSet = true;
    }
    metadataContent.properties.files.push({
      uri: file.uri,
      type: file.type
    })
  })

  if (coverFile) {
    const coverFileUpload = uploadedFilePins.files.find(file => file.name == coverFile.name)
    if (coverFileUpload) {
      metadataContent.image = coverFileUpload.uri
    }
  }
  
  if (mainFile) {
    const mainFileUpload = uploadedFilePins.files.find(file => file.name == mainFile.name)
    if (mainFileUpload) {
      metadataContent.animation_url = mainFileUpload.uri
    }
  }

  const metaData = new File([JSON.stringify(metadataContent)], RESERVED_METADATA)
  const metaDataFileForm = new FormData()
  metaDataFileForm.append(`file[${metaData.name}]`, metaData, metaData.name)

  const metaDataUploadResponse = await fetch(
    nftStorageHolaplexEndpoint,
    {
      mode: "cors",
      method: "POST",
      body: metaDataFileForm,
    })

  if (!metaDataUploadResponse.ok) {
    throw new Error("Unable to upload NFT metadata to IPFS. Please wait a moment and try again.")
  }

  const uploadedMetaDataPinResponse = await metaDataUploadResponse.json()
  const uploadedMetaDataPin = uploadedMetaDataPinResponse.files[0]

  progressCallback(2)

  const TOKEN_PROGRAM_ID = programIds().token;

  // Allocate memory for the account
  const mintRent = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );

  const payerPublicKey = wallet.publicKey.toBase58();
  const instructions: TransactionInstruction[] = [];
  const signers: Keypair[] = [];

  // This is only temporarily owned by wallet...transferred to program by createMasterEdition below
  const mintKey = createMint(
    instructions,
    wallet.publicKey,
    mintRent,
    0,
    // Some weird bug with phantom where it's public key doesnt mesh with data encode wellff
    toPublicKey(payerPublicKey),
    toPublicKey(payerPublicKey),
    signers,
  ).toBase58();

  const recipientKey = (
    await findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        programIds().token.toBuffer(),
        toPublicKey(mintKey).toBuffer(),
      ],
      programIds().associatedToken,
    )
  )[0];

  createAssociatedTokenAccountInstruction(
    instructions,
    toPublicKey(recipientKey),
    wallet.publicKey,
    wallet.publicKey,
    toPublicKey(mintKey),
  );

  const metadataAccount = await createMetadata(
    new Data({
      symbol: metadata.symbol,
      name: metadata.name,
      uri: uploadedMetaDataPin.uri,
      sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
      creators: metadata.creators,
    }),
    payerPublicKey,
    mintKey,
    payerPublicKey,
    instructions,
    wallet.publicKey.toBase58(),
  );

  if (uploadedMetaDataPin && wallet.publicKey) {
    const updateInstructions: TransactionInstruction[] = instructions;
    const updateSigners: Keypair[] = signers;

    progressCallback(3)


    updateInstructions.push(
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID,
        toPublicKey(mintKey),
        toPublicKey(recipientKey),
        toPublicKey(payerPublicKey),
        [],
        1,
      ),
    );

    // // In this instruction, mint authority will be removed from the main mint, while
    // // minting authority will be maintained for the Printing mint (which we want.)
    await createMasterEdition(
      maxSupply !== undefined ? new BN(maxSupply) : undefined,
      mintKey,
      payerPublicKey,
      payerPublicKey,
      payerPublicKey,
      updateInstructions,
    );

    progressCallback(4)

    await sendTransactionWithRetry(
      connection,
      wallet,
      updateInstructions,
      updateSigners,
    );

    notify({
      message: 'Art created on Solana',
      description: (
        <a href={uploadedMetaDataPin.uri} target="_blank" rel="noopener noreferrer">
          Metadata Link
        </a>
      ),
      type: 'success',
    });

  }
  return { metadataAccount };
};

export const prepPayForFilesTxn = async (
  wallet: WalletSigner,
  files: File[],
  metadata: any,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> => {
  const memo = programIds().memo;

  const instructions: TransactionInstruction[] = [];
  const signers: Keypair[] = [];

  if (wallet.publicKey)
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: AR_SOL_HOLDER_ID,
        lamports: 2300000 // 0.0023 SOL per file (paid to arweave)
        // await getAssetCostToStore(files),
      }),
    );

  for (let i = 0; i < files.length; i++) {
    const hashSum = crypto.createHash('sha256');
    hashSum.update(await files[i].text());
    const hex = hashSum.digest('hex');
    instructions.push(
      new TransactionInstruction({
        keys: [],
        programId: memo,
        data: Buffer.from(hex),
      }),
    );
  }

  return {
    instructions,
    signers,
  };
};
