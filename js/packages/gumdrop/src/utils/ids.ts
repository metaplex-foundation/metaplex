import * as anchor from '@project-serum/anchor';
import { Connection, PublicKey, AccountInfo } from '@solana/web3.js';

export type StringPublicKey = string;

export class LazyAccountInfoProxy<T> {
  executable: boolean = false;
  owner: StringPublicKey = '';
  lamports: number = 0;

  get data() {
    //
    return undefined as unknown as T;
  }
}

export interface LazyAccountInfo {
  executable: boolean;
  owner: StringPublicKey;
  lamports: number;
  data: [string, string];
}

const PubKeysInternedMap = new Map<string, PublicKey>();

export const toPublicKey = (key: string | PublicKey) => {
  if (typeof key !== 'string') {
    return key;
  }

  let result = PubKeysInternedMap.get(key);
  if (!result) {
    result = new PublicKey(key);
    PubKeysInternedMap.set(key, result);
  }

  return result;
};

export interface PublicKeyStringAndAccount<T> {
  pubkey: string;
  account: AccountInfo<T>;
}

export const WRAPPED_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

export const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

export const BPF_UPGRADE_LOADER_ID = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');

export const MEMO_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export const SYSTEM = new PublicKey('11111111111111111111111111111111');

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export const CANDY_MACHINE_ID = new PublicKey('DDnmBpiGYyeoPGqfjxEoANTP5x3WXzU4NYv8tdHmGyPi');

export const MERKLE_DISTRIBUTOR_ID = new PublicKey("561gX85SDR4hYF2L7P4LcvdXsWSxWuY7Z1yGgznPwSXG");

export const MERKLE_TEMPORAL_SIGNER = new PublicKey("MSv9H2sMceAzccBganUXwGq3GXgqYAstmZAbFDZYbAV");

export const fetchCoder = async (
  address : anchor.Address,
  connection : Connection,
) : Promise<anchor.Coder | null> => {
  return new anchor.Coder(await anchor.Program.fetchIdl(
      address, { connection: connection } as anchor.Provider));
}

export const getCandyConfig = async (
  connection : Connection,
  config : string
) : Promise<PublicKey> => {
  let configKey : PublicKey;
  try {
    configKey = new PublicKey(config);
  } catch (err) {
    throw new Error(`Invalid config key ${err}`);
  }
  const configAccount = await connection.getAccountInfo(configKey);
  if (configAccount === null) {
    throw new Error(`Could not fetch config`);
  }
  if (!configAccount.owner.equals(CANDY_MACHINE_ID)) {
    throw new Error(`Invalid config owner ${configAccount.owner.toBase58()}`);
  }
  return configKey;
};

export const getCandyMachineAddress = async (
  config: PublicKey,
  uuid: string,
) => {
  return await PublicKey.findProgramAddress(
    [Buffer.from("candy_machine"), config.toBuffer(), Buffer.from(uuid)],
    CANDY_MACHINE_ID,
  );
};

export const getCandyMachine = async (
  connection : Connection,
  candyMachineKey : PublicKey,
) => {
  const candyMachineCoder = await fetchCoder(CANDY_MACHINE_ID, connection);
  if (candyMachineCoder === null) {
    throw new Error(`Could not fetch candy machine IDL`);
  }
  const candyMachineAccount = await connection.getAccountInfo(candyMachineKey);
  if (candyMachineAccount === null) {
    throw new Error(`Could not fetch candy machine`);
  }
  return candyMachineCoder.accounts.decode(
      "CandyMachine", candyMachineAccount.data);
}
