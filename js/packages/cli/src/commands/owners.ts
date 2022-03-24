import { Connection } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '../helpers/constants';
import log from 'loglevel';

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
