import {
  Metadata,
  getMultipleAccounts,
  cache,
  MintParser,
  ParsedAccount,
} from '@oyster/common';
import { MintInfo } from '@solana/spl-token';
import { Connection } from '@solana/web3.js';

export const queryExtendedMetadata = async (
  connection: Connection,
  mintToMeta: Record<string, ParsedAccount<Metadata>>,
) => {
  const mintToMetadata = { ...mintToMeta };

  const mints = await getMultipleAccounts(
    connection,
    [...Object.keys(mintToMetadata)].filter(k => !cache.get(k)),
    'single',
  );

  mints.keys.forEach((key, index) => {
    const mintAccount = mints.array[index];
    if (mintAccount) {
      const mint = cache.add(
        key,
        mintAccount,
        MintParser,
        false,
      ) as ParsedAccount<MintInfo>;
      if (!mint.info.supply.eqn(1) || mint.info.decimals !== 0) {
        // naive not NFT check
        delete mintToMetadata[key];
      } else {
        // const metadata = mintToMetadata[key];
      }
    }
  });

  // await Promise.all([...extendedMetadataFetch.values()]);
  const metadata = [...Object.values(mintToMetadata)];

  return {
    metadata,
    mintToMetadata,
  };
};
