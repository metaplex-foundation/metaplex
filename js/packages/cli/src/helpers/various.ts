import { LAMPORTS_PER_SOL, AccountInfo } from '@solana/web3.js';
import fs from 'fs';
import weighted from 'weighted';
import path from 'path';
import { BN, Program, web3 } from '@project-serum/anchor';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { StorageType } from './storage-type';
import { getAtaForMint } from './accounts';
import { CLUSTERS, DEFAULT_CLUSTER } from './constants';

const { readFile } = fs.promises;

export async function getCandyMachineV2Config(
  walletKeyPair: web3.Keypair,
  anchorProgram: Program,
  configPath: any,
): Promise<{
  storage: StorageType;
  ipfsInfuraProjectId: string;
  number: number;
  ipfsInfuraSecret: string;
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
  const configString = fs.readFileSync(configPath);

  //@ts-ignore
  const config = JSON.parse(configString);

  const {
    storage,
    ipfsInfuraProjectId,
    number,
    ipfsInfuraSecret,
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
  if (splToken) {
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
    if (whitelistMintSettings?.discountPrice) {
      whitelistMintSettings.discountPrice *= 10 ** mintInfo.decimals;
    }
  } else {
    parsedPrice = price * 10 ** 9;
    if (whitelistMintSettings?.discountPrice) {
      whitelistMintSettings.discountPrice *= 10 ** 9;
    }
    wallet = solTreasuryAccount
      ? new web3.PublicKey(solTreasuryAccount)
      : walletKeyPair.publicKey;
  }

  if (whitelistMintSettings) {
    whitelistMintSettings.mint = new web3.PublicKey(whitelistMintSettings.mint);
    if (whitelistMintSettings?.discountPrice) {
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
    ipfsInfuraProjectId,
    number,
    ipfsInfuraSecret,
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
export async function readJsonFile(fileName: string) {
  const file = await readFile(fileName, 'utf-8');
  return JSON.parse(file);
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

export const assertValidBreakdown = breakdown => {
  const total = Object.values(breakdown).reduce(
    (sum: number, el: number) => (sum += el),
    0,
  );
  if (total > 101 || total < 99) {
    console.log(breakdown);
    throw new Error('Breakdown not within 1% of 100! It is: ' + total);
  }
};

export const generateRandomSet = (breakdown, dnp) => {
  let valid = true;
  let tmp = {};

  do {
    valid = true;
    const keys = shuffle(Object.keys(breakdown));
    keys.forEach(attr => {
      const breakdownToUse = breakdown[attr];

      const formatted = Object.keys(breakdownToUse).reduce((f, key) => {
        if (breakdownToUse[key]['baseValue']) {
          f[key] = breakdownToUse[key]['baseValue'];
        } else {
          f[key] = breakdownToUse[key];
        }
        return f;
      }, {});

      assertValidBreakdown(formatted);
      const randomSelection = weighted.select(formatted);
      tmp[attr] = randomSelection;
    });

    keys.forEach(attr => {
      let breakdownToUse = breakdown[attr];

      keys.forEach(otherAttr => {
        if (
          tmp[otherAttr] &&
          typeof breakdown[otherAttr][tmp[otherAttr]] != 'number' &&
          breakdown[otherAttr][tmp[otherAttr]][attr]
        ) {
          breakdownToUse = breakdown[otherAttr][tmp[otherAttr]][attr];

          console.log(
            'Because this item got attr',
            tmp[otherAttr],
            'we are using different probabilites for',
            attr,
          );

          assertValidBreakdown(breakdownToUse);
          const randomSelection = weighted.select(breakdownToUse);
          tmp[attr] = randomSelection;
        }
      });
    });

    Object.keys(tmp).forEach(attr1 => {
      Object.keys(tmp).forEach(attr2 => {
        if (
          dnp[attr1] &&
          dnp[attr1][tmp[attr1]] &&
          dnp[attr1][tmp[attr1]][attr2] &&
          dnp[attr1][tmp[attr1]][attr2].includes(tmp[attr2])
        ) {
          console.log('Not including', tmp[attr1], tmp[attr2], 'together');
          valid = false;
          tmp = {};
        }
      });
    });
  } while (!valid);
  return tmp;
};

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

export function generateRandoms(
  numberOfAttrs: number = 1,
  total: number = 100,
) {
  const numbers = [];
  const loose_percentage = total / numberOfAttrs;

  for (let i = 0; i < numberOfAttrs; i++) {
    const random = Math.floor(Math.random() * loose_percentage) + 1;
    numbers.push(random);
  }

  const sum = numbers.reduce((prev, cur) => {
    return prev + cur;
  }, 0);

  numbers.push(total - sum);
  return numbers;
}

export const getMetadata = (
  name: string = '',
  symbol: string = '',
  index: number = 0,
  creators,
  description: string = '',
  seller_fee_basis_points: number = 500,
  attrs,
  collection,
  treatAttributesAsFileNames: boolean,
) => {
  const attributes = [];
  for (const prop in attrs) {
    attributes.push({
      trait_type: prop,
      value: treatAttributesAsFileNames
        ? path.parse(attrs[prop]).name
        : attrs[prop],
    });
  }

  return {
    name: `${name}${index + 1}`,
    symbol,
    image: `${index}.png`,
    properties: {
      files: [
        {
          uri: `${index}.png`,
          type: 'image/png',
        },
      ],
      category: 'image',
      creators,
    },
    description,
    seller_fee_basis_points,
    attributes,
    collection,
  };
};

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
  for (const cluster of CLUSTERS) {
    if (cluster.name === name) {
      return cluster.url;
    }
  }
  return DEFAULT_CLUSTER.url;
}
