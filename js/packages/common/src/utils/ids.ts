import { PublicKey } from '@solana/web3.js';
import { TokenSwapLayout, TokenSwapLayoutV1 } from '../models/tokenSwap';

export const STORE_OWNER_ADDRESS = process.env
  .REACT_APP_STORE_OWNER_ADDRESS_ADDRESS
  ? new PublicKey(`${process.env.REACT_APP_STORE_OWNER_ADDRESS_ADDRESS}`)
  : // DEFAULT STORE FRONT OWNER FOR METAPLEX
    undefined;
console.debug(`Store owner address: ${STORE_OWNER_ADDRESS?.toBase58()}`);

export const WRAPPED_SOL_MINT = new PublicKey(
  'So11111111111111111111111111111111111111112',
);
export let TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

export let SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);
export let BPF_UPGRADE_LOADER_ID = new PublicKey(
  'BPFLoaderUpgradeab1e11111111111111111111111',
);

export const METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

export const MEMO_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
);

export const VAULT_ID = new PublicKey(
  'vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn',
);

export const AUCTION_ID = new PublicKey(
  'auctxRXPeJoc4817jDhf4HbjnhEcr1cCXenosMhK5R8',
);

export const METAPLEX_ID = new PublicKey(
  'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98',
);

export let SYSTEM = new PublicKey('11111111111111111111111111111111');

export const ENABLE_FEES_INPUT = false;

// legacy pools are used to show users contributions in those pools to allow for withdrawals of funds
export const PROGRAM_IDS = [
  {
    name: 'mainnet-beta',
  },
  {
    name: 'testnet',
  },

  {
    name: 'devnet',
  },
  {
    name: 'localnet',
  },
];

const getStoreID = async () => {
  console.log(`STORE_OWNER_ADDRESS: ${STORE_OWNER_ADDRESS?.toBase58()}`);
  if (!STORE_OWNER_ADDRESS) {
    return undefined;
  }

  const programs = await PublicKey.findProgramAddress(
    [
      Buffer.from('metaplex'),
      METAPLEX_ID.toBuffer(),
      STORE_OWNER_ADDRESS.toBuffer(),
    ],
    METAPLEX_ID,
  );
  const CUSTOM = programs[0];
  console.log(`CUSTOM STORE: ${CUSTOM.toBase58()}`);

  return CUSTOM;
};

export const setProgramIds = async (envName: string) => {
  let instance = PROGRAM_IDS.find(env => envName.indexOf(env.name) >= 0);
  if (!instance) {
    return;
  }

  if (!STORE) {
    STORE = await getStoreID();
  }
};

let STORE: PublicKey | undefined;

export const programIds = () => {
  return {
    token: TOKEN_PROGRAM_ID,
    associatedToken: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    bpf_upgrade_loader: BPF_UPGRADE_LOADER_ID,
    system: SYSTEM,
    metadata: METADATA_PROGRAM_ID,
    memo: MEMO_ID,
    vault: VAULT_ID,
    auction: AUCTION_ID,
    metaplex: METAPLEX_ID,
    store: STORE,
  };
};
