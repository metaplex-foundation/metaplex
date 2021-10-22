import * as anchor from '@project-serum/anchor';
import FormData from 'form-data';
import fs from 'fs';
import log from 'loglevel';
import fetch from 'node-fetch';
import { ARWEAVE_PAYMENT_WALLET } from '../constants';
import { sendTransactionWithRetryWithKeypair } from '../transactions';

// FIXME unable to use anything from @oyster/common with ts-node
// Note that autocomplete works for everything in @oysterm/common except new additions
// like @oyster/common/utils assets
type UseStorageReturnValue = {
  getItem: (key: string) => string;
  setItem: (key: string, value: string) => boolean;
  removeItem: (key: string) => void;
};

const useLocalStorage = (): UseStorageReturnValue => {
  const isBrowser: boolean = ((): boolean => typeof window !== 'undefined')();

  const getItem = (key: string): string => {
    return isBrowser ? window.localStorage[key] : '';
  };

  const setItem = (key: string, value: string): boolean => {
    if (isBrowser) {
      window.localStorage.setItem(key, value);
      return true;
    }

    return false;
  };

  const removeItem = (key: string): void => {
    window.localStorage.removeItem(key);
  };

  return {
    getItem,
    setItem,
    removeItem,
  };
};

const LAMPORT_MULTIPLIER = 10 ** 9;
const WINSTON_MULTIPLIER = 10 ** 12;
const ARWEAVE_UPLOAD_ENDPOINT =
  'https://us-central1-metaplex-studios.cloudfunctions.net/uploadFile';
async function getAssetCostToStore(files: { size: number }[]) {
  const localStorage = useLocalStorage();
  const totalBytes = files.reduce((sum, f) => (sum += f.size), 0);

  console.log('Total bytes', totalBytes);

  const txnFeeInWinstons = parseInt(
    await (await fetch('https://arweave.net/price/0')).text(),
  );

  console.log('txn fee', txnFeeInWinstons);

  const byteCostInWinstons = parseInt(
    await (
      await fetch('https://arweave.net/price/' + totalBytes.toString())
    ).text(),
  );

  console.log('byte cost', byteCostInWinstons);

  const totalArCost =
    (txnFeeInWinstons * files.length + byteCostInWinstons) / WINSTON_MULTIPLIER;

  console.log('total ar', totalArCost);

  let conversionRates = JSON.parse(
    localStorage.getItem('conversionRates') || '{}',
  );

  if (
    !conversionRates ||
    !conversionRates.expiry ||
    conversionRates.expiry < Date.now()
  ) {
    console.log('Calling conversion rate');
    conversionRates = {
      value: JSON.parse(
        await (
          await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=solana,arweave&vs_currencies=usd',
          )
        ).text(),
      ),
      expiry: Date.now() + 5 * 60 * 1000,
    };

    if (conversionRates.value.solana) {
      try {
        localStorage.setItem(
          'conversionRates',
          JSON.stringify(conversionRates),
        );
      } catch {
        // ignore
      }
    }
  }

  // To figure out how many lamports are required, multiply ar byte cost by this number
  const arMultiplier =
    conversionRates.value.arweave.usd / conversionRates.value.solana.usd;

  console.log('Ar mult', arMultiplier);

  // We also always make a manifest file, which, though tiny, needs payment.
  return LAMPORT_MULTIPLIER * totalArCost * arMultiplier * 1.1;
}

import { stat } from 'fs/promises';

async function upload(data: FormData, manifest, index) {
  log.debug(`trying to upload ${index}.png: ${manifest.name}`);
  return await (
    await fetch(ARWEAVE_UPLOAD_ENDPOINT, {
      method: 'POST',
      // @ts-ignore
      body: data,
    })
  ).json();
}

export async function arweaveUpload(
  walletKeyPair,
  anchorProgram,
  env,
  image,
  manifestBuffer,
  manifest,
  index,
) {
  const fsStat = await stat(image);
  const storageCost = await getAssetCostToStore([{ size: fsStat.size }]);
  console.log(`storage cost of ${image}: ${storageCost}`);

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
    'single',
  );
  log.debug('transaction for arweave payment:', tx);

  const data = new FormData();
  data.append('transaction', tx['txid']);
  data.append('env', env);
  data.append('file[]', fs.createReadStream(image), {
    filename: `image.png`,
    contentType: 'image/png',
  });
  data.append('file[]', manifestBuffer, 'metadata.json');

  const result = await upload(data, manifest, index);

  const metadataFile = result.messages?.find(
    m => m.filename === 'manifest.json',
  );
  if (metadataFile?.transactionId) {
    const link = `https://arweave.net/${metadataFile.transactionId}`;
    log.debug(`File uploaded: ${link}`);
    return link;
  } else {
    // @todo improve
    throw new Error(`No transaction ID for upload: ${index}`);
  }
}
