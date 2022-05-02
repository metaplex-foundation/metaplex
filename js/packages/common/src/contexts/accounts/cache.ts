import { AccountInfo, Connection, PublicKey } from '@solana/web3.js';
import { MintInfo } from '@solana/spl-token';
import { TokenAccount } from '../../models';
import { EventEmitter } from '../../utils/eventEmitter';
import { ParsedAccountBase, AccountParser } from './types';
import { deserializeMint } from './deserialize';

export const genericCache = new Map<string, ParsedAccountBase>();
const mintCache = new Map<string, MintInfo>();
const pendingCalls = new Map<string, Promise<ParsedAccountBase>>();
const pendingMintCalls = new Map<string, Promise<MintInfo>>();

const keyToAccountParser = new Map<string, AccountParser>();

const getMintInfo = async (connection: Connection, pubKey: PublicKey) => {
  const info = await connection.getAccountInfo(pubKey);
  if (info === null) {
    throw new Error('Failed to find mint account');
  }

  const data = Buffer.from(info.data);

  return deserializeMint(data);
};

export const cache = {
  emitter: new EventEmitter(),
  query: async (
    connection: Connection,
    pubKey: string | PublicKey,
    parser?: AccountParser,
  ) => {
    let id: PublicKey;
    if (typeof pubKey === 'string') {
      id = new PublicKey(pubKey);
    } else {
      id = pubKey;
    }

    const address = id.toBase58();

    const account = genericCache.get(address);
    if (account) {
      return account;
    }

    let query = pendingCalls.get(address);
    if (query) {
      return query;
    }

    // TODO: refactor to use multiple accounts query with flush like behavior
    query = connection.getAccountInfo(id).then(data => {
      if (!data) {
        throw new Error('Account not found');
      }

      return cache.add(id, data, parser);
    }) as Promise<TokenAccount>;
    pendingCalls.set(address, query as any);

    return query;
  },
  add: (
    id: PublicKey | string,
    obj: AccountInfo<Buffer>,
    parser?: AccountParser,
    isActive?: boolean | undefined | ((parsed: any) => boolean),
  ) => {
    const address = typeof id === 'string' ? id : id?.toBase58();
    const deserialize = parser ? parser : keyToAccountParser.get(address);
    if (!deserialize) {
      throw new Error(
        'Deserializer needs to be registered or passed as a parameter',
      );
    }

    cache.registerParser(id, deserialize);
    pendingCalls.delete(address);
    const account = deserialize(address, obj);
    if (!account) {
      return;
    }

    if (isActive === undefined) isActive = true;
    else if (isActive instanceof Function) isActive = isActive(account);

    const isNew = !genericCache.has(address);

    genericCache.set(address, account);
    cache.emitter.raiseCacheUpdated(address, isNew, deserialize, isActive);
    return account;
  },
  get: (pubKey: string | PublicKey) => {
    let key: string;
    if (typeof pubKey !== 'string') {
      key = pubKey.toBase58();
    } else {
      key = pubKey;
    }

    return genericCache.get(key);
  },
  delete: (pubKey: string | PublicKey) => {
    let key: string;
    if (typeof pubKey !== 'string') {
      key = pubKey.toBase58();
    } else {
      key = pubKey;
    }

    if (genericCache.get(key)) {
      genericCache.delete(key);
      cache.emitter.raiseCacheDeleted(key);
      return true;
    }
    return false;
  },

  byParser: (parser: AccountParser) => {
    const result: string[] = [];
    for (const id of keyToAccountParser.keys()) {
      if (keyToAccountParser.get(id) === parser) {
        result.push(id);
      }
    }

    return result;
  },
  registerParser: (pubkey: PublicKey | string, parser: AccountParser) => {
    if (pubkey) {
      const address = typeof pubkey === 'string' ? pubkey : pubkey?.toBase58();
      keyToAccountParser.set(address, parser);
    }

    return pubkey;
  },
  queryMint: async (connection: Connection, pubKey: string | PublicKey) => {
    let id: PublicKey;
    if (typeof pubKey === 'string') {
      id = new PublicKey(pubKey);
    } else {
      id = pubKey;
    }

    const address = id.toBase58();
    const mint = mintCache.get(address);
    if (mint) {
      return mint;
    }

    let query = pendingMintCalls.get(address);
    if (query) {
      return query;
    }

    query = getMintInfo(connection, id).then(data => {
      pendingMintCalls.delete(address);

      mintCache.set(address, data);
      return data;
    }) as Promise<MintInfo>;
    pendingMintCalls.set(address, query as any);

    return query;
  },
  getMint: (pubKey: string | PublicKey) => {
    let key: string;
    if (typeof pubKey !== 'string') {
      key = pubKey.toBase58();
    } else {
      key = pubKey;
    }

    return mintCache.get(key);
  },
  addMint: (pubKey: PublicKey, obj: AccountInfo<Buffer>) => {
    const mint = deserializeMint(obj.data);
    const id = pubKey.toBase58();
    mintCache.set(id, mint);
    return mint;
  },
};

export const getCachedAccount = (
  predicate: (account: TokenAccount) => boolean,
) => {
  for (const account of genericCache.values()) {
    if (predicate(account)) {
      return account as TokenAccount;
    }
  }
};
