import { LAMPORTS_PER_SOL, AccountInfo } from '@solana/web3.js';
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

export function chunks(array, size) {
  return Array.apply(0, new Array(Math.ceil(array.length / size))).map(
    (_, index) => array.slice(index * size, (index + 1) * size),
  );
}

export function parsePrice(price: string, mantissa: number = LAMPORTS_PER_SOL) {
  return Math.ceil(parseFloat(price) * mantissa);
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
