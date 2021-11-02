import { TokenAccount } from './account';
import { ParsedAccountBase } from './types';
import { deserializeMint, deserializeAccount } from './deserialize';
import { StringPublicKey, AccountInfoOwnerString } from '../../utils';

export const MintParser = (
  pubKey: StringPublicKey,
  info: AccountInfoOwnerString<Buffer>,
) => {
  const buffer = Buffer.from(info.data);

  const data = deserializeMint(buffer);

  const details: ParsedAccountBase = {
    pubkey: pubKey,
    account: {
      ...info,
    },
    info: data,
  };

  return details;
};

export const TokenAccountParser = (
  pubKey: StringPublicKey,
  info: AccountInfoOwnerString<Buffer>,
): TokenAccount | undefined => {
  // Sometimes a wrapped sol account gets closed, goes to 0 length,
  // triggers an update over wss which triggers this guy to get called
  // since your UI already logged that pubkey as a token account. Check for length.
  if (info.data.length > 0) {
    const buffer = Buffer.from(info.data);
    const data = deserializeAccount(buffer);

    const details: TokenAccount = {
      pubkey: pubKey,
      account: {
        ...info,
      },
      info: data,
    };

    return details;
  }
};

export const GenericAccountParser = (
  pubKey: StringPublicKey,
  info: AccountInfoOwnerString<Buffer>,
): ParsedAccountBase => {
  const buffer = Buffer.from(info.data);

  const details: ParsedAccountBase = {
    pubkey: pubKey,
    account: {
      ...info,
    },
    info: buffer,
  };

  return details;
};
