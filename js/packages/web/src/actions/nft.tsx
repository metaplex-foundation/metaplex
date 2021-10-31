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
  IMetadataExtension,
} from '@oyster/common';
import React, { Dispatch, SetStateAction, useState } from 'react';
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
import { ArweaveWallet } from '../views/artCreate';
import Arweave from "arweave";

const arweaveConnection = Arweave.init({ host: "arweave.net" });

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

const uploadWithArWallet = async(filesMoreThan10mb: File[], arWallet: ArweaveWallet, metadata, mintKey): Promise<string> => {

  const arweaveUpload = async(fileToUpload: string | ArrayBuffer, arWallet, txTag?: string, mintKey?: string) => {

    let transaction = await arweaveConnection.createTransaction(
      { data: fileToUpload},
      arWallet
    );

    if (mintKey) {
      transaction.addTag("mint", mintKey)
    } 

    if (txTag) transaction.addTag("Content-Type", txTag);

    await arweaveConnection.transactions.sign(transaction, arWallet);

    let uploader = await arweaveConnection.transactions.getUploader(
      transaction
    );

    while (!uploader.isComplete) {
      await uploader.uploadChunk();
      console.log(
        `${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`
      );
    }

    console.log("UPLOADED FILE TO", `https://arweave.net/${transaction.id}`)

    return transaction.id;
  }

  var metadataContent = {
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

  console.log(
    "FILE MORE THAN 10mb DETECTED. There are ",
    filesMoreThan10mb.length,
    "files."
  );

  // upload all files
  for (var i = 0; i < filesMoreThan10mb.length; i++) {

    const fileType = filesMoreThan10mb[i].type || "glb";

    console.log("Uploading", filesMoreThan10mb[i].name)

    const arweaveTransacionId = await arweaveUpload(await filesMoreThan10mb[i].arrayBuffer(), arWallet, fileType)

    //! ARWEAVE

    if (fileType == "image/jpeg") {
      metadataContent.image = `https://arweave.net/${arweaveTransacionId}`;
    } else {
      metadataContent.animation_url = `https://arweave.net/${arweaveTransacionId}`; // if filetype not image, add amination URL to it
    }

    //! ARWEAVE
    for (var j = 0; j < metadataContent.properties.files!.length; j++) {
/*       console.log(
        "Looking for file of type",
        fileType,
        "and this file has",
        metadataContent.properties.files[j].type
      ); */
      if (metadataContent.properties.files[j].type == fileType)
        metadataContent.properties.files[j] = {
                "uri": `https://arweave.net/${arweaveTransacionId}`,
                "type": fileType
              };
    }


    //! ARWEAVE UPLOADER
  }

  // upload manifest file
  const manifestTxId = await arweaveUpload(JSON.stringify(metadataContent), arWallet, "application/json", mintKey)

  return manifestTxId
}

const uploadToArweave = async (data: FormData): Promise<IArweaveResult> => {
  console.log("ARWEAVEDATA", data)
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

  if (result.error) {
    return Promise.reject(new Error(result.error));
  }

  return result;
};

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
  arWallet?: ArweaveWallet,
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


  //! UPLOADER

  const filesLessThan10mb = files.filter((m) => m.size < 10_000_000);
  const filesMoreThan10mb = files.filter((m) => m.size >= 10_000_000);



  console.log("METADATCONTENT", metadataContent)

  const realFiles: File[] = [
    ...filesLessThan10mb,
    new File([JSON.stringify(metadataContent)], RESERVED_METADATA),
  ];

  const { instructions: pushInstructions, signers: pushSigners } =
    await prepPayForFilesTxn(wallet, realFiles, metadata);

  progressCallback(1);

  const TOKEN_PROGRAM_ID = programIds().token;

  // Allocate memory for the account
  const mintRent = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );
  // const accountRent = await connection.getMinimumBalanceForRentExemption(
  //   AccountLayout.span,
  // );

  // This owner is a temporary signer and owner of metadata we use to circumvent requesting signing
  // twice post Arweave. We store in an account (payer) and use it post-Arweave to update MD with new link
  // then give control back to the user.
  // const payer = new Account();
  const payerPublicKey = wallet.publicKey.toBase58();
  const instructions: TransactionInstruction[] = [...pushInstructions];
  const signers: Keypair[] = [...pushSigners];

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
      uri: ' '.repeat(64), // size of url for arweave
      sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
      creators: metadata.creators,
    }),
    payerPublicKey,
    mintKey,
    payerPublicKey,
    instructions,
    wallet.publicKey.toBase58(),
  );
  progressCallback(2);

  // TODO: enable when using payer account to avoid 2nd popup
  // const block = await connection.getRecentBlockhash('singleGossip');
  // instructions.push(
  //   SystemProgram.transfer({
  //     fromPubkey: wallet.publicKey,
  //     toPubkey: payerPublicKey,
  //     lamports: 0.5 * LAMPORTS_PER_SOL // block.feeCalculator.lamportsPerSignature * 3 + mintRent, // TODO
  //   }),
  // );

  const { txid } = await sendTransactionWithRetry(
    connection,
    wallet,
    instructions,
    signers,
    'single',
  );
  progressCallback(3);

  try {
    await connection.confirmTransaction(txid, 'max');
    progressCallback(4);
  } catch {
    // ignore
  }

  // Force wait for max confirmations
  // await connection.confirmTransaction(txid, 'max');
  await connection.getParsedConfirmedTransaction(txid, 'confirmed');

  progressCallback(5);

  let arweaveTxId = ''
  if (filesMoreThan10mb.length == 0) {
    // this means we're done getting AR txn setup. Ship it off to ARWeave!
    const data = new FormData();
    data.append('transaction', txid);
    data.append('env', env);

    const tags = realFiles.reduce(
      (acc: Record<string, Array<{ name: string; value: string }>>, f) => {
        acc[f.name] = [{ name: 'mint', value: mintKey }];
        return acc;
      },
      {},
    );
    data.append('tags', JSON.stringify(tags));
    realFiles.map(f => data.append('file[]', f));

    // TODO: convert to absolute file name for image
    console.log("PREUPLOAD AR", data, txid, env)
    const result: IArweaveResult = await uploadToArweave(data);
    progressCallback(6);

    const metadataFile = result.messages?.find(
      m => m.filename === RESERVED_TXN_MANIFEST,
    );
    
    arweaveTxId = metadataFile?.transactionId!

  } else {
    if (!arWallet) throw new Error("Detected files with more than 10mb but no wallet provided");
    progressCallback(6);
    arweaveTxId = await uploadWithArWallet(files, arWallet, metadata, mintKey)
  }

  if (arweaveTxId && wallet.publicKey) {
    console.log("SET THE AR ID", arweaveTxId)

    const updateInstructions: TransactionInstruction[] = [];
    const updateSigners: Keypair[] = [];

    // TODO: connect to testnet arweave
    const arweaveLink = `https://arweave.net/${arweaveTxId}`;
    await updateMetadata(
      new Data({
        name: metadata.name,
        symbol: metadata.symbol,
        uri: arweaveLink,
        creators: metadata.creators,
        sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
      }),
      undefined,
      undefined,
      mintKey,
      payerPublicKey,
      updateInstructions,
      metadataAccount,
    );

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

    progressCallback(7);
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

    // TODO: enable when using payer account to avoid 2nd popup
    /*  if (maxSupply !== undefined)
      updateInstructions.push(
        setAuthority({
          target: authTokenAccount,
          currentAuthority: payerPublicKey,
          newAuthority: wallet.publicKey,
          authorityType: 'AccountOwner',
        }),
      );
*/
    // TODO: enable when using payer account to avoid 2nd popup
    // Note with refactoring this needs to switch to the updateMetadataAccount command
    // await transferUpdateAuthority(
    //   metadataAccount,
    //   payerPublicKey,
    //   wallet.publicKey,
    //   updateInstructions,
    // );

    progressCallback(8);

    const txid = await sendTransactionWithRetry(
      connection,
      wallet,
      updateInstructions,
      updateSigners,
    );

    notify({
      message: 'Art created on Solana',
      description: (
        <a href={arweaveLink} target="_blank" rel="noopener noreferrer">
          Arweave Link
        </a>
      ),
      type: 'success',
    });

    // TODO: refund funds

    // send transfer back to user
  }
  // TODO:
  // 1. Jordan: --- upload file and metadata to storage API
  // 2. pay for storage by hashing files and attaching memo for each file

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
        lamports: 2300000, // 0.0023 SOL per file (paid to arweave)
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
