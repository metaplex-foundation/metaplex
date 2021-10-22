import {
  AccountInfo,
  Connection,
  GetProgramAccountsFilter,
} from "@solana/web3.js";
import { StringPublicKey } from "./ids";
import { AccountAndPubkey } from "./types";

function chunks<T>(array: T[], size: number): T[][] {
  return Array.apply<number, T[], T[][]>(
    0,
    new Array(Math.ceil(array.length / size))
  ).map((_, index) => array.slice(index * size, (index + 1) * size));
}

export async function getProgramAccounts(
  connection: Connection,
  programId: StringPublicKey,
  filters?: GetProgramAccountsFilter[],
  configOrCommitment?: any
): Promise<Array<AccountAndPubkey>> {
  const extra: any = { filters: filters };

  const args = connection._buildArgs([programId], "recent", "base64", extra);
  const unsafeRes = await (connection as any)._rpcRequest(
    "getProgramAccounts",
    args
  );

  return unsafeResAccounts(unsafeRes.result);
}

export function unsafeAccount(account: AccountInfo<[string, string]>) {
  return {
    // TODO: possible delay parsing could be added here
    data: Buffer.from(account.data[0], "base64"),
    executable: account.executable,
    lamports: account.lamports,
    // TODO: maybe we can do it in lazy way? or just use string
    owner: account.owner,
  } as AccountInfo<Buffer>;
}

export function unsafeResAccounts(
  data: Array<{
    account: AccountInfo<[string, string]>;
    pubkey: string;
  }>
) {
  return data.map((item) => ({
    account: unsafeAccount(item.account),
    pubkey: item.pubkey,
  }));
}

export const getMultipleAccounts = async (
  connection: any,
  keys: string[],
  commitment: string
) => {
  const result = await Promise.all(
    chunks(keys, 99).map((chunk) =>
      getMultipleAccountsCore(connection, chunk, commitment)
    )
  );

  const array = result
    .map(
      (a) =>
        a.array.map((acc) => {
          if (!acc) {
            return undefined;
          }

          const { data, ...rest } = acc;
          const obj = {
            ...rest,
            data: Buffer.from(data[0], "base64"),
          } as AccountInfo<Buffer>;
          return obj;
        }) as AccountInfo<Buffer>[]
    )
    .flat();
  return { keys, array };
};

const getMultipleAccountsCore = async (
  connection: any,
  keys: string[],
  commitment: string
) => {
  const args = connection._buildArgs([keys], commitment, "base64");

  const unsafeRes = await connection._rpcRequest("getMultipleAccounts", args);
  if (unsafeRes.error) {
    throw new Error(
      "failed to get info about account " + unsafeRes.error.message
    );
  }

  if (unsafeRes.result.value) {
    const array = unsafeRes.result.value as AccountInfo<string[]>[];
    return { keys, array };
  }

  // TODO: fix
  throw new Error();
};
