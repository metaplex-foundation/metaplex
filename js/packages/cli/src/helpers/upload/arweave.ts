import * as anchor from '@project-serum/anchor';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import log from 'loglevel';
import fetch from 'node-fetch';
import { stat } from 'fs/promises';
import { calculate } from '@metaplex/arweave-cost';
import { ARWEAVE_PAYMENT_WALLET } from '../constants';
import { sendTransactionWithRetryWithKeypair } from '../transactions';

const ARWEAVE_UPLOAD_ENDPOINT =
  'https://us-central1-metaplex-studios.cloudfunctions.net/uploadFile';

async function fetchAssetCostToStore(fileSizes: number[]) {
  const result = await calculate(fileSizes);
  log.debug('Arweave cost estimates:', result);

  return result.solana * anchor.web3.LAMPORTS_PER_SOL;
}

async function upload(data: FormData, manifest, index) {
  log.debug(`trying to upload image ${index}: ${manifest.name}`);
  return await (
    await fetch(ARWEAVE_UPLOAD_ENDPOINT, {
      method: 'POST',
      // @ts-ignore
      body: data,
    })
  ).json();
}

function estimateManifestSize(filenames: string[]) {
  const paths = {};

  for (const name of filenames) {
    paths[name] = {
      id: 'artestaC_testsEaEmAGFtestEGtestmMGmgMGAV438',
      ext: path.extname(name).replace('.', ''),
    };
  }

  const manifest = {
    manifest: 'arweave/paths',
    version: '0.1.0',
    paths,
    index: {
      path: 'metadata.json',
    },
  };

  const data = Buffer.from(JSON.stringify(manifest), 'utf8');
  log.debug('Estimated manifest size:', data.length);
  return data.length;
}

export async function arweaveUpload(
  walletKeyPair,
  anchorProgram,
  env,
  image,
  animation,
  manifestBuffer, // TODO rename metadataBuffer
  manifest, // TODO rename metadata
  index,
) {
  const imageExt = path.extname(image);
  let fsStat = await stat(image);
  const manifestFiles = [
    `${index}${imageExt}`,
    'metadata.json',
  ]
  const storageCostSizes = [
    fsStat.size,
    manifestBuffer.length,
  ]
  let animationExt = undefined;
  if (animation) {
    animationExt = path.extname(animation);
    fsStat = await stat(animation);
    manifestFiles.push(`${index}${animationExt}`);
    storageCostSizes.push(fsStat.size);
  }
  const estimatedManifestSize = estimateManifestSize(manifestFiles);
  storageCostSizes.push(estimatedManifestSize);
  const storageCost = await fetchAssetCostToStore(storageCostSizes);
  log.debug(`lamport cost to store ${image}: ${storageCost}`);

  const instructions = [
    anchor.web3.SystemProgram.transfer({
      fromPubkey: walletKeyPair.publicKey,
      toPubkey: ARWEAVE_PAYMENT_WALLET,
      lamports: storageCost,
    }),
  ];

  const tx = await sendTransactionWithRetryWithKeypair(
    anchorProgram.provider.connection,
    walletKeyPair,
    instructions,
    [],
    'confirmed',
  );
  log.debug(`solana transaction (${env}) for arweave payment:`, tx);

  const data = new FormData();
  data.append('transaction', tx['txid']);
  data.append('env', env);
  data.append('file[]', fs.createReadStream(image), {
    filename: `${index}${imageExt}`,
    contentType: `image/${imageExt.replace('.', '')}`,
  });
  if (animation) {
    data.append('file[]', fs.createReadStream(animation), {
      filename: `${index}${animationExt}`,
      contentType: `image/${animationExt.replace('.', '')}`,
    });
  }
  data.append('file[]', manifestBuffer, 'metadata.json');

  const result = await upload(data, manifest, index);

  const metadataFile = result.messages?.find(
    m => m.filename === 'manifest.json',
  );
  const imageFile = result.messages?.find(
    m => m.filename === `${index}${imageExt}`,
  );
  const animationFile = result.messages?.find(
    m => m.filename === `${index}${animationExt}`,
  );
  if (metadataFile?.transactionId) {
    const link = `https://arweave.net/${metadataFile.transactionId}`;
    const imageLink = `https://arweave.net/${
      imageFile.transactionId
    }?ext=${imageExt.replace('.', '')}`;
    let animationLink = undefined;
    if (animation) {
      animationLink = `https://arweave.net/${
        animationFile.transactionId
      }?ext=${animationExt.replace('.', '')}`;
    }
    log.debug(`File uploaded: ${link}`);
    return [link, imageLink, animationLink];
  } else {
    // @todo improve
    throw new Error(`No transaction ID for upload: ${index}`);
  }
}
