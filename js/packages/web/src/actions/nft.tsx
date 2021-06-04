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
  createTokenAccount,
  Data,
  Creator,
  MetadataCategory,
} from '@oyster/common';
import React from 'react';
import { AccountLayout, MintLayout, Token } from '@solana/spl-token';
import { WalletAdapter } from '@solana/wallet-base';
import {
  Keypair,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import crypto from 'crypto';
import { getAssetCostToStore } from '../utils/assets';
import { AR_SOL_HOLDER_ID } from '../utils/ids';
import BN from 'bn.js';
const RESERVED_TXN_MANIFEST = 'manifest.json';

interface IArweaveResult {
  error?: string;
  messages?: Array<{
    filename: string;
    status: 'success' | 'fail';
    transactionId?: string;
    error?: string;
  }>;
}

const URL = {
  snail: [
    'https://www.arweave.net/n8e1p5kS5Q7L9jxQZtTodKZoGFWwFmyusXFJbM8vvIA',
    'https://watch.videodelivery.net/52a52c4a261c88f19d267931426c9be6',
  ],
  bull: [
    'https://www.arweave.net/3vWxrmANPU95g8rDa2b7gHjrYTa7lbV-bXpuELYhbEk',
    'https://watch.videodelivery.net/99b858950e88a0c05c3cb245ad08961d',
  ],
  bison: [
    'https://www.arweave.net/nKgdQEaQ1wAbg4ZsY7G4vjWWvE9kNCrVtceXoRf6_q4',
    'https://watch.videodelivery.net/6c94202d68d6583aa44d724b329a1bb6',
  ],
  ape: [
    'https://www.arweave.net/E8yXvWKiYzDid4IVzXWvE7dIHxMSHWRIQ3GBcMS2Rx8',
    'https://watch.videodelivery.net/4e43cdf136b01d071fc08d5a4330e887',
  ],
  llama: [
    'https://www.arweave.net/uNZIcaBWTwQINHMGsPaBcXZh8vQDxPGcTS466uiL8aE',
    'https://watch.videodelivery.net/4598604231a5035ca7b6c676c90bdb03',
  ],
  snake: [
    'https://www.arweave.net/aJmwR4D9PxjQFsa3qlTrZJJM2Hkhw4JAcEvf6BZrXGs',
    'https://watch.videodelivery.net/a6997bf226e423d41e999381a4aeab38',
  ],
  griffin: [
    'https://www.arweave.net/sFmH3mfNNX1mggKgkRQ7W_cBinOJx6pNBsKOFx9bj9A',
    'https://watch.videodelivery.net/0bd66c8db2e24b760fa56d68ced6610f',
  ],
  kestrel: [
    'https://www.arweave.net/OWtQMhtICzAwPw2RcJZE_vYwcRzG3pNGA--_u-op7NQ',
    'https://watch.videodelivery.net/51159cf3dbc65ef5267093f922766d1e',
  ],
  mandrill: [
    'https://www.arweave.net/bTuy1ap150TRPUrGHJNomHtNLcYeXWJZhYBfYtyivPo',
    'https://watch.videodelivery.net/84521704ac3417d94c02eae43caef941',
  ],
  albatross: [
    'https://www.arweave.net/gD-9zKTpnrgd8lR7ExOG1Q_Ge4dFmXsR4aLsiyO1Jw4',
    'https://watch.videodelivery.net/17b926769afc3aca2725f5b80d9d9b81',
  ],
  lobster: [
    'https://www.arweave.net/HBpSaWkb4lk9_uKqLX-Z9opEXsg6MuLQ6o2IOoDMO9w',
    'https://watch.videodelivery.net/5d9df44658642db32afcce0dc8151c83',
  ],
  hamster: [
    'https://www.arweave.net/d_jHCPSKRhrjsl0uq2eSel2IVgrJh8T9L4RTDNtErjM',
    'https://watch.videodelivery.net/d01a7a2d72e046e13bc6f11b76f3b647',
  ],
};

export const mintNFT = async (
  connection: Connection,
  wallet: WalletAdapter | undefined,
  env: ENV,
  files: File[],
  metadata: {
    name: string;
    symbol: string;
    description: string;
    image: string | undefined;
    external_url: string;
    properties: any;
    creators: Creator[] | null;
    sellerFeeBasisPoints: number;
  },
  maxSupply?: number,
): Promise<{
  metadataAccount: PublicKey;
} | void> => {
  if (!wallet?.publicKey) {
    return;
  }

  const realFiles: File[] = [
    ...files,
    new File(
      [
        JSON.stringify({
          name: metadata.name,
          symbol: metadata.symbol,
          description: metadata.description,
          seller_fee_basis_points: metadata.sellerFeeBasisPoints,
          image: metadata.image,
          external_url: metadata.external_url,
          properties: {
            ...metadata.properties,
            category: MetadataCategory.Video,
            files: [...metadata.properties.files],
            fileTypes: ['metadata', 'image'],
            creators: metadata.creators?.map(creator => {
              return {
                address: creator.address.toBase58(),
                verified: creator.verified,
                share: creator.share,
              };
            }),
          },
        }),
      ],
      'metadata.json',
    ),
  ];

  const { instructions: pushInstructions, signers: pushSigners } =
    await prepPayForFilesTxn(wallet, realFiles, metadata);

  const TOKEN_PROGRAM_ID = programIds().token;

  // Allocate memory for the account
  const mintRent = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );
  const accountRent = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );

  // This owner is a temporary signer and owner of metadata we use to circumvent requesting signing
  // twice post Arweave. We store in an account (payer) and use it post-Arweave to update MD with new link
  // then give control back to the user.
  // const payer = new Account();
  const payerPublicKey = wallet.publicKey;
  const instructions: TransactionInstruction[] = [...pushInstructions];
  const signers: Keypair[] = [...pushSigners];

  // This is only temporarily owned by wallet...transferred to program by createMasterEdition below
  const mintKey = createMint(
    instructions,
    wallet.publicKey,
    mintRent,
    0,
    // Some weird bug with phantom where it's public key doesnt mesh with data encode wellff
    payerPublicKey,
    payerPublicKey,
    signers,
  );

  const recipientKey: PublicKey = (
    await PublicKey.findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        programIds().token.toBuffer(),
        mintKey.toBuffer(),
      ],
      programIds().associatedToken,
    )
  )[0];

  createAssociatedTokenAccountInstruction(
    instructions,
    recipientKey,
    wallet.publicKey,
    wallet.publicKey,
    mintKey,
  );

  instructions.push(
    Token.createMintToInstruction(
      TOKEN_PROGRAM_ID,
      mintKey,
      recipientKey,
      payerPublicKey,
      [],
      1,
    ),
  );

  const metadataAccount = await createMetadata(
    new Data({
      symbol: metadata.symbol,
      name: metadata.name,
      uri: `https://-------.---/rfX69WKd7Bin_RTbcnH4wM3BuWWsR_ZhWSSqZBLYdMY`,
      sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
      creators: metadata.creators,
    }),
    payerPublicKey,
    mintKey,
    payerPublicKey,
    instructions,
    wallet.publicKey,
  );

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
  );

  try {
    await connection.confirmTransaction(txid, 'max');
  } catch {
    // ignore
  }

  // Force wait for max confirmations
  // await connection.confirmTransaction(txid, 'max');
  await connection.getParsedConfirmedTransaction(txid, 'confirmed');

  // this means we're done getting AR txn setup. Ship it off to ARWeave!
  const data = new FormData();

  const tags = realFiles.reduce(
    (acc: Record<string, Array<{ name: string; value: string }>>, f) => {
      acc[f.name] = [{ name: 'mint', value: mintKey.toBase58() }];
      return acc;
    },
    {},
  );
  data.append('tags', JSON.stringify(tags));
  data.append('transaction', txid);
  realFiles.map(f => data.append('file[]', f));

  // TODO: convert to absolute file name for image

  const result: IArweaveResult = await (
    await fetch(
      // TODO: add CNAME
      env === 'mainnet-beta'
        ? 'https://us-central1-principal-lane-200702.cloudfunctions.net/uploadFileProd-1'
        : 'https://us-central1-principal-lane-200702.cloudfunctions.net/uploadFile-1',
      {
        method: 'POST',
        body: data,
      },
    )
  ).json();

  const metadataFile = result.messages?.find(
    m => m.filename === RESERVED_TXN_MANIFEST,
  );
  if (metadataFile?.transactionId && wallet.publicKey) {
    const updateInstructions: TransactionInstruction[] = [];
    const updateSigners: Keypair[] = [];

    // TODO: connect to testnet arweave
    const arweaveLink = `https://arweave.net/${metadataFile.transactionId}`;
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

    // // This mint, which allows limited editions to be made, stays with user's wallet.
    const printingMint = createMint(
      updateInstructions,
      payerPublicKey,
      mintRent,
      0,
      payerPublicKey,
      payerPublicKey,
      updateSigners,
    );

    const oneTimePrintingAuthorizationMint = createMint(
      updateInstructions,
      payerPublicKey,
      mintRent,
      0,
      payerPublicKey,
      payerPublicKey,
      updateSigners,
    );

    if (maxSupply !== undefined) {
      // make this so we can use it later.
      const authTokenAccount: PublicKey = (
        await PublicKey.findProgramAddress(
          [
            wallet.publicKey.toBuffer(),
            programIds().token.toBuffer(),
            printingMint.toBuffer(),
          ],
          programIds().associatedToken,
        )
      )[0];
      createAssociatedTokenAccountInstruction(
        instructions,
        authTokenAccount,
        wallet.publicKey,
        wallet.publicKey,
        printingMint,
      );
    }
    // // In this instruction, mint authority will be removed from the main mint, while
    // // minting authority will be maintained for the Printing mint (which we want.)
    await createMasterEdition(
      maxSupply !== undefined ? new BN(maxSupply) : undefined,
      mintKey,
      printingMint,
      oneTimePrintingAuthorizationMint,
      payerPublicKey,
      payerPublicKey,
      updateInstructions,
      payerPublicKey,
      payerPublicKey,
      maxSupply !== undefined ? payerPublicKey : undefined,
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

    const txid = await sendTransactionWithRetry(
      connection,
      wallet,
      updateInstructions,
      updateSigners,
    );

    notify({
      message: 'Art created on Solana',
      description: (
        <a href={arweaveLink} target="_blank">
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
  wallet: WalletAdapter,
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
        lamports: await getAssetCostToStore(files),
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
