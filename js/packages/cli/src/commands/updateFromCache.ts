import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import { sendTransactionWithRetryWithKeypair } from '../helpers/transactions';
import { serialize } from 'borsh';

import log from 'loglevel';
import { sleep } from '../helpers/various';
import { delay, getAccountsByCreatorAddress } from './signAll';
import { createUpdateMetadataInstruction } from '../helpers/instructions';
import {
  Creator,
  Data,
  METADATA_SCHEMA,
  UpdateMetadataArgs,
} from '../helpers/schema';

const SIGNING_INTERVAL = 60 * 1000; //60s

export async function updateFromCache(
  connection: Connection,
  wallet: Keypair,
  candyMachineAddress: string,
  batchSize: number,
  daemon: boolean,
  cacheContent: any,
  newCacheContent: any,
) {
  if (daemon) {
    // noinspection InfiniteLoopJS
    for (;;) {
      await updateMetadataFromCache(
        candyMachineAddress,
        connection,
        wallet,
        batchSize,
        cacheContent,
        newCacheContent,
      );
      await sleep(SIGNING_INTERVAL);
    }
  } else {
    await updateMetadataFromCache(
      candyMachineAddress,
      connection,
      wallet,
      batchSize,
      cacheContent,
      newCacheContent,
    );
  }
}

export async function updateMetadataFromCache(
  candyMachineAddress: string,
  connection: Connection,
  wallet: Keypair,
  batchSize: number,
  cacheContent: any,
  newCacheContent: any,
) {
  const metadataByCandyMachine = await getAccountsByCreatorAddress(
    candyMachineAddress,
    connection,
  );
  const differences = {};
  for (let i = 0; i < Object.keys(cacheContent.items).length; i++) {
    if (
      cacheContent.items[i.toString()].link !=
      newCacheContent.items[i.toString()].link
    ) {
      differences[cacheContent.items[i.toString()].link] =
        newCacheContent.items[i.toString()].link;
    }
  }
  const toUpdate = metadataByCandyMachine.filter(
    m => !!differences[m[0].data.uri],
  );
  log.info('Found', toUpdate.length, 'uris to update');
  let total = 0;
  while (toUpdate.length > 0) {
    log.debug('Signing metadata ');
    let sliceAmount = batchSize;
    if (toUpdate.length < batchSize) {
      sliceAmount = toUpdate.length;
    }
    const removed = toUpdate.splice(0, sliceAmount);
    total += sliceAmount;
    await delay(500);
    await updateMetadataBatch(removed, connection, wallet, differences);
    log.debug(`Processed ${total} nfts`);
  }
  log.info(`Finished signing metadata for ${total} NFTs`);
}

async function updateMetadataBatch(
  metadataList,
  connection,
  keypair,
  differences,
) {
  const instructions: TransactionInstruction[] = metadataList.map(meta => {
    const newData = new Data({
      ...meta[0].data,
      creators: meta[0].data.creators.map(
        c =>
          new Creator({ ...c, address: new PublicKey(c.address).toBase58() }),
      ),
      uri: differences[meta[0].data.uri],
    });

    const value = new UpdateMetadataArgs({
      data: newData,
      updateAuthority: keypair.publicKey.toBase58(),
      primarySaleHappened: null,
    });
    const txnData = Buffer.from(serialize(METADATA_SCHEMA, value));
    return createUpdateMetadataInstruction(
      new PublicKey(meta[1]),
      keypair.publicKey,
      txnData,
    );
  });
  await sendTransactionWithRetryWithKeypair(
    connection,
    keypair,
    instructions,
    [],
    'single',
  );
}
