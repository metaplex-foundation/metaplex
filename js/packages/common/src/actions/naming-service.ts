import { Connection } from '@solana/web3.js';
import { getHandleAndRegistryKey } from '@solana/spl-name-service';
import { toPublicKey, StringPublicKey } from '../utils';

export const getTwitterHandle = async (
  connection: Connection,
  pubkey: StringPublicKey,
): Promise<string | undefined> => {
  try {
    const [twitterHandle] = await getHandleAndRegistryKey(
      connection,
      toPublicKey(pubkey),
    );
    return twitterHandle;
  } catch (err) {
    console.warn(`err: `, err);
    return undefined;
  }
};
