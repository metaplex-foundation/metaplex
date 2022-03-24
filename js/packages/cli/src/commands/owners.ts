import { Connection, PublicKey } from '@solana/web3.js';
import {
  CANDY_MACHINE_PROGRAM_V2_ID,
  TOKEN_PROGRAM_ID,
} from '../helpers/constants';
import { chunks } from '../helpers/various';
import log from 'loglevel';

import * as bs58 from 'bs58';
import * as cliProgress from 'cli-progress';
import { PromisePool } from '@supercharge/promise-pool';

export async function getOwnersByMintAddresses(
  addresses: Array<string>,
  connection: Connection,
  concurrency: number | undefined,
) {
  const owners = [];

  log.debug("Recuperation of the owners' addresses");

  const progressBar = new cliProgress.SingleBar(
    {
      format: 'Progress: [{bar}] {percentage}% | {value}/{total}',
    },
    cliProgress.Presets.shades_classic,
  );
  progressBar.start(addresses.length, 0);

  await PromisePool.withConcurrency(concurrency || 10)
    .for(addresses)
    .handleError(async (err, address) => {
      log.error(
        `\nError fetching owner for ${address} (skipping)`,
        err.message,
      );
      await delay(5000);
    })
    .process(async address => {
      owners.push(await getOwnerOfTokenAddress(address, connection));
      progressBar.increment();
    });

  progressBar.stop();

  return owners;
}

async function getOwnerOfTokenAddress(address, connection) {
  try {
    const programAccountsConfig = {
      filters: [
        {
          dataSize: 165,
        },
        {
          memcmp: {
            offset: 0,
            bytes: address,
          },
        },
      ],
    };
    const results = await connection.getParsedProgramAccounts(
      TOKEN_PROGRAM_ID,
      programAccountsConfig,
    );

    const tokenOwner = results.find(
      token => token.account.data.parsed.info.tokenAmount.amount == 1,
    );
    const ownerAddress = tokenOwner.account.data.parsed.info.owner;

    return ownerAddress;
  } catch (error) {
    console.log(`Unable to get owner of: ${address}`);
  }
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getAllSignaturesForAddress(
  address: PublicKey,
  connection: Connection,
) {
  const progressBar = new cliProgress.SingleBar(
    {
      format: 'Progress: [{bar}] {percentage}% | {value}/{total}',
    },
    cliProgress.Presets.shades_classic,
  );

  progressBar.start(0, 0);

  const signatures = [];
  for (;;) {
    const next = await connection.getSignaturesForAddress(
      address,
      signatures.length > 0
        ? { before: signatures[signatures.length - 1] }
        : {},
    );
    if (next.length === 0) break;
    signatures.push(...next.filter(s => s.err === null).map(s => s.signature));
    progressBar.setTotal(signatures.length);
    progressBar.update(signatures.length);
  }

  progressBar.stop();

  return signatures;
}

export async function getOriginalMinters(
  signatures: Array<string>,
  connection: Connection,
  concurrency: number | undefined,
  batchSize: number | undefined,
) {
  const batches: Array<Array<string>> = chunks(signatures, batchSize || 10);

  const progressBar = new cliProgress.SingleBar(
    {
      format: 'Progress: [{bar}] {percentage}% | {value}/{total}',
    },
    cliProgress.Presets.shades_classic,
  );
  progressBar.start(batches.length, 0);

  const transactions = [];
  await PromisePool.withConcurrency(concurrency || 10)
    .for(batches)
    .handleError(async (err, batch) => {
      log.error(
        `\nError fetching transactions in batch ${batch} (skipping)`,
        err.message,
      );
      await delay(5000);
    })
    .process(async (batch: Array<string>) => {
      transactions.push(...(await connection.getParsedTransactions(batch)));
      progressBar.increment();
    });

  progressBar.stop();

  console.log('Parsing transactions...');

  progressBar.start(transactions.length, 0);

  const minters = [];
  // sighash("global:mintNft")
  const mintNftDiscriminant = Buffer.from([211, 57, 6, 167, 15, 219, 35, 251]);
  for (const transaction of transactions) {
    if (transaction === null) continue;
    const message = transaction.transaction.message;
    for (const instruction of message.instructions) {
      if (!instruction.programId.equals(CANDY_MACHINE_PROGRAM_V2_ID)) continue;

      const discriminator = bs58.decode(instruction.data).slice(0, 8);
      if (!discriminator.equals(mintNftDiscriminant)) continue;

      minters.push({
        minter: message.accountKeys[0].pubkey,
        mint: instruction.accounts[5],
      });
      break;
    }
    progressBar.increment();
  }

  progressBar.stop();

  return minters;
}
