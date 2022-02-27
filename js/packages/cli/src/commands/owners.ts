import { TOKEN_PROGRAM_ID } from '../helpers/constants';
import log from 'loglevel';

export async function getOwnersByMintAddresses(addresses, connection) {
  const owners = [];

  log.debug("Recuperation of the owners' addresses");
  for (const address of addresses) {
    owners.push(await getOwnerOfTokenAddress(address, connection));
    await delay(500);
  }

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
