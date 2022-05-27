import {
  LAMPORTS_PER_SOL,
  AccountInfo,
  PublicKey,
  Connection,
  Keypair,
} from '@solana/web3.js';
import fs from 'fs';
import log from 'loglevel';
import { BN, Program, web3 } from '@project-serum/anchor';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { StorageType } from './storage-type';

import { getAtaForMint } from './accounts';
import { CLUSTERS, DEFAULT_CLUSTER } from './constants';
import {
  Uses,
  UseMethod,
  Metadata,
  MetadataKey,
} from '@metaplex-foundation/mpl-token-metadata';

export async function getCandyMachineV2Config(
  walletKeyPair: web3.Keypair,
  anchorProgram: Program,
  configPath: any,
): Promise<{
  storage: StorageType;
  nftStorageKey: string | null;
  nftStorageGateway: string | null;
  ipfsInfuraProjectId: string;
  number: number;
  ipfsInfuraSecret: string;
  pinataJwt: string;
  pinataGateway: string;
  awsS3Bucket: string;
  retainAuthority: boolean;
  mutable: boolean;
  batchSize: number;
  price: BN;
  treasuryWallet: web3.PublicKey;
  splToken: web3.PublicKey | null;
  gatekeeper: null | {
    expireOnUse: boolean;
    gatekeeperNetwork: web3.PublicKey;
  };
  endSettings: null | [number, BN];
  whitelistMintSettings: null | {
    mode: any;
    mint: web3.PublicKey;
    presale: boolean;
    discountPrice: null | BN;
  };
  hiddenSettings: null | {
    name: string;
    uri: string;
    hash: Uint8Array;
  };
  goLiveDate: BN | null;
  uuid: string;
  arweaveJwk: string;
}> {
  if (configPath === undefined) {
    throw new Error('The configPath is undefined');
  }
  const configString = fs.readFileSync(configPath);

  //@ts-ignore
  const config = JSON.parse(configString);

  const {
    storage,
    nftStorageKey,
    nftStorageGateway,
    ipfsInfuraProjectId,
    number,
    ipfsInfuraSecret,
    pinataJwt,
    pinataGateway,
    awsS3Bucket,
    noRetainAuthority,
    noMutable,
    batchSize,
    price,
    splToken,
    splTokenAccount,
    solTreasuryAccount,
    gatekeeper,
    endSettings,
    hiddenSettings,
    whitelistMintSettings,
    goLiveDate,
    uuid,
    arweaveJwk,
  } = config;

  let wallet;
  let parsedPrice = price;

  const splTokenAccountFigured = splTokenAccount
    ? splTokenAccount
    : splToken
    ? (
        await getAtaForMint(
          new web3.PublicKey(splToken),
          walletKeyPair.publicKey,
        )
      )[0]
    : null;
  if (splTokenAccount) {
    if (solTreasuryAccount) {
      throw new Error(
        'If spl-token-account or spl-token is set then sol-treasury-account cannot be set',
      );
    }
    if (!splToken) {
      throw new Error(
        'If spl-token-account is set, spl-token must also be set',
      );
    }
    const splTokenKey = new web3.PublicKey(splToken);
    const splTokenAccountKey = new web3.PublicKey(splTokenAccountFigured);
    if (!splTokenAccountFigured) {
      throw new Error(
        'If spl-token is set, spl-token-account must also be set',
      );
    }

    const token = new Token(
      anchorProgram.provider.connection,
      splTokenKey,
      TOKEN_PROGRAM_ID,
      walletKeyPair,
    );

    const mintInfo = await token.getMintInfo();
    if (!mintInfo.isInitialized) {
      throw new Error(`The specified spl-token is not initialized`);
    }
    const tokenAccount = await token.getAccountInfo(splTokenAccountKey);
    if (!tokenAccount.isInitialized) {
      throw new Error(`The specified spl-token-account is not initialized`);
    }
    if (!tokenAccount.mint.equals(splTokenKey)) {
      throw new Error(
        `The spl-token-account's mint (${tokenAccount.mint.toString()}) does not match specified spl-token ${splTokenKey.toString()}`,
      );
    }

    wallet = new web3.PublicKey(splTokenAccountKey);
    parsedPrice = price * 10 ** mintInfo.decimals;
    if (
      whitelistMintSettings?.discountPrice ||
      whitelistMintSettings?.discountPrice === 0
    ) {
      whitelistMintSettings.discountPrice *= 10 ** mintInfo.decimals;
    }
  } else {
    parsedPrice = price * 10 ** 9;
    if (
      whitelistMintSettings?.discountPrice ||
      whitelistMintSettings?.discountPrice === 0
    ) {
      whitelistMintSettings.discountPrice *= 10 ** 9;
    }
    wallet = solTreasuryAccount
      ? new web3.PublicKey(solTreasuryAccount)
      : walletKeyPair.publicKey;
  }

  if (whitelistMintSettings) {
    whitelistMintSettings.mint = new web3.PublicKey(whitelistMintSettings.mint);
    if (
      whitelistMintSettings?.discountPrice ||
      whitelistMintSettings?.discountPrice === 0
    ) {
      whitelistMintSettings.discountPrice = new BN(
        whitelistMintSettings.discountPrice,
      );
    }
  }

  if (endSettings) {
    if (endSettings.endSettingType.date) {
      endSettings.number = new BN(parseDate(endSettings.value));
    } else if (endSettings.endSettingType.amount) {
      endSettings.number = new BN(endSettings.value);
    }
    delete endSettings.value;
  }

  if (hiddenSettings) {
    const utf8Encode = new TextEncoder();
    hiddenSettings.hash = utf8Encode.encode(hiddenSettings.hash);
  }

  if (gatekeeper) {
    gatekeeper.gatekeeperNetwork = new web3.PublicKey(
      gatekeeper.gatekeeperNetwork,
    );
  }

  return {
    storage,
    nftStorageKey,
    nftStorageGateway,
    ipfsInfuraProjectId,
    number,
    ipfsInfuraSecret,
    pinataJwt,
    pinataGateway: pinataGateway ? pinataGateway : null,
    awsS3Bucket,
    retainAuthority: !noRetainAuthority,
    mutable: !noMutable,
    batchSize,
    price: new BN(parsedPrice),
    treasuryWallet: wallet,
    splToken: splToken ? new web3.PublicKey(splToken) : null,
    gatekeeper,
    endSettings,
    hiddenSettings,
    whitelistMintSettings,
    goLiveDate: goLiveDate ? new BN(parseDate(goLiveDate)) : null,
    uuid,
    arweaveJwk,
  };
}

export function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

export const getUnixTs = () => {
  return new Date().getTime() / 1000;
};

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function fromUTF8Array(data: number[]) {
  // array of bytes
  let str = '',
    i;

  for (i = 0; i < data.length; i++) {
    const value = data[i];

    if (value < 0x80) {
      str += String.fromCharCode(value);
    } else if (value > 0xbf && value < 0xe0) {
      str += String.fromCharCode(((value & 0x1f) << 6) | (data[i + 1] & 0x3f));
      i += 1;
    } else if (value > 0xdf && value < 0xf0) {
      str += String.fromCharCode(
        ((value & 0x0f) << 12) |
          ((data[i + 1] & 0x3f) << 6) |
          (data[i + 2] & 0x3f),
      );
      i += 2;
    } else {
      // surrogate pair
      const charCode =
        (((value & 0x07) << 18) |
          ((data[i + 1] & 0x3f) << 12) |
          ((data[i + 2] & 0x3f) << 6) |
          (data[i + 3] & 0x3f)) -
        0x010000;

      str += String.fromCharCode(
        (charCode >> 10) | 0xd800,
        (charCode & 0x03ff) | 0xdc00,
      );
      i += 3;
    }
  }

  return str;
}

export function parsePrice(price: string, mantissa: number = LAMPORTS_PER_SOL) {
  return Math.ceil(parseFloat(price) * mantissa);
}

export function parseDate(date) {
  if (date === 'now') {
    return Date.now() / 1000;
  }
  return Date.parse(date) / 1000;
}

export const getMultipleAccounts = async (
  connection: any,
  keys: string[],
  commitment: string,
) => {
  const result = await Promise.all(
    chunks(keys, 99).map(chunk =>
      getMultipleAccountsCore(connection, chunk, commitment),
    ),
  );

  const array = result
    .map(
      a =>
        //@ts-ignore
        a.array.map(acc => {
          if (!acc) {
            return undefined;
          }

          const { data, ...rest } = acc;
          const obj = {
            ...rest,
            data: Buffer.from(data[0], 'base64'),
          } as AccountInfo<Buffer>;
          return obj;
        }) as AccountInfo<Buffer>[],
    )
    //@ts-ignore
    .flat();
  return { keys, array };
};

export function chunks(array, size) {
  return Array.apply(0, new Array(Math.ceil(array.length / size))).map(
    (_, index) => array.slice(index * size, (index + 1) * size),
  );
}

const getMultipleAccountsCore = async (
  connection: any,
  keys: string[],
  commitment: string,
) => {
  const args = connection._buildArgs([keys], commitment, 'base64');

  const unsafeRes = await connection._rpcRequest('getMultipleAccounts', args);
  if (unsafeRes.error) {
    throw new Error(
      'failed to get info about account ' + unsafeRes.error.message,
    );
  }

  if (unsafeRes.result.value) {
    const array = unsafeRes.result.value as AccountInfo<string[]>[];
    return { keys, array };
  }

  // TODO: fix
  throw new Error();
};

export const getPriceWithMantissa = async (
  price: number,
  mint: web3.PublicKey,
  walletKeyPair: any,
  anchorProgram: Program,
): Promise<number> => {
  const token = new Token(
    anchorProgram.provider.connection,
    new web3.PublicKey(mint),
    TOKEN_PROGRAM_ID,
    walletKeyPair,
  );

  const mintInfo = await token.getMintInfo();

  const mantissa = 10 ** mintInfo.decimals;

  return Math.ceil(price * mantissa);
};

export function getCluster(name: string): string {
  if (name === '') {
    log.info('Using cluster', DEFAULT_CLUSTER.name);
    return DEFAULT_CLUSTER.url;
  }

  for (const cluster of CLUSTERS) {
    if (cluster.name === name) {
      log.info('Using cluster', cluster.name);
      return cluster.url;
    }
  }

  throw new Error(`Could not get cluster: ${name}`);
  return null;
}

export function parseUses(useMethod: string, total: number): Uses | null {
  if (!!useMethod && !!total) {
    const realUseMethod = (UseMethod as any)[useMethod];
    if (!realUseMethod) {
      throw new Error(`Invalid use method: ${useMethod}`);
    }
    return new Uses({ useMethod: realUseMethod, total, remaining: total });
  }
  return null;
}

export async function parseCollectionMintPubkey(
  collectionMint: null | PublicKey,
  connection: Connection,
  walletKeypair: Keypair,
) {
  let collectionMintPubkey: null | PublicKey = null;
  if (collectionMint) {
    try {
      collectionMintPubkey = new PublicKey(collectionMint);
    } catch (error) {
      throw new Error(
        'Invalid Pubkey option. Please enter it as a base58 mint id',
      );
    }
    const token = new Token(
      connection,
      collectionMintPubkey,
      TOKEN_PROGRAM_ID,
      walletKeypair,
    );
    await token.getMintInfo();
  }
  if (collectionMintPubkey) {
    const metadata = await Metadata.findByMint(
      connection,
      collectionMintPubkey,
    ).catch();
    if (metadata.data.updateAuthority !== walletKeypair.publicKey.toString()) {
      throw new Error(
        'Invalid collection mint option. Metadata update authority does not match provided wallet keypair',
      );
    }
    const edition = await Metadata.getEdition(connection, collectionMintPubkey);
    if (
      edition.data.key !== MetadataKey.MasterEditionV1 &&
      edition.data.key !== MetadataKey.MasterEditionV2
    ) {
      throw new Error(
        'Invalid collection mint. Provided collection mint does not have a master edition associated with it.',
      );
    }
  }
  return collectionMintPubkey;
}
