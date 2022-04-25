import path from 'path';
import { Keypair, PublicKey, TransactionCtorFields } from '@solana/web3.js';
import { tmpdir } from 'os';
import { readFileSync } from 'fs';
import { LOCALHOST } from '@metaplex-foundation/amman';

export const connectionURL = LOCALHOST;

// Devnet fee payer
export const FEE_PAYER = Keypair.fromSecretKey(
  new Uint8Array([
    225, 60, 117, 68, 123, 252, 1, 200, 41, 251, 54, 121, 6, 167, 204, 18, 140, 168, 206, 74, 254,
    156, 230, 10, 212, 124, 162, 85, 120, 78, 122, 106, 187, 209, 148, 182, 34, 149, 175, 173, 192,
    85, 175, 252, 231, 130, 76, 40, 175, 177, 44, 111, 250, 168, 3, 236, 149, 34, 236, 19, 46, 9,
    66, 138,
  ]),
);

export const STORE_OWNER_PUBKEY = new PublicKey('7hKMAoCYJuBnBLmVTjswu7m6jcwyE8MYAP5hPijUT6nd');
export const STORE_PUBKEY = new PublicKey('DNQzo4Aggw8PneX7BGY7niEkB8wfNJwx6DpV9BLBUUFF');
export const AUCTION_MANAGER_PUBKEY = new PublicKey('Gjd1Mo8KLEgywxMKaDRhaoD2Fu8bzoVLZ8H7v761XXkf');
export const AUCTION_PUBKEY = new PublicKey('BTE7AqJn4aG2MKZnaSTEgbQ4aCgPTDmphs5uxDnuDqvQ');
export const AUCTION_EXTENDED_PUBKEY = new PublicKey(
  '9nUKpweEWpk5mQiBzxYWB62dhQR5NtaZDShccqsWnPGa',
);
export const VAULT_PUBKEY = new PublicKey('BE43QppYzwWVVSobScMbPgqKogPHsHQoogXgLH3ZTFtW');
export const METADATA_PUBKEY = new PublicKey('CZkFeERacU42qjApPyjamS13fNtz7y1wYLu5jyLpN1WL');
export const MASTER_EDITION_PUBKEY = new PublicKey('EZ5xB174dcz982WXV2aNr4zSW5ywAH3gP5Lbj8CuRMw4');
export const PACKSET_PUBKEY = new PublicKey('AN1bTGLCLSoSTJMeBPa7KGRDF5BpbfvD7oA42ZMq27Ru');
export const PACKCARD_PUBKEY = new PublicKey('BVrBhek71ZDDPQ8tYucBiEKxYmmtQLioF3eJJnhH6md4');
export const PACKVOUCHER_PUBKEY = new PublicKey('Ah6ngnNfhzKFfMPtiK5BeQ4mF5Nzwv1bwtbAEgMYH6Dp');
export const PROVING_PROCESS_PUBKEY = new PublicKey('HCzXvi3L1xdkFp5jafadFGzbirua9U4r4ePiXvcqH81R');

export const VAULT_AUTHORITY_PUBKEY = new PublicKey('AHsj4FffgTUYUVDjwBRGmiAsJcpWxX3YXZB8qsuew79t');
export const FRACTIONAL_MINT_PUBKEY = new PublicKey('1Qyhk9Pm1XktCN8RptQrwe9KnQLmiD7E58LpvqcnSV8');
export const REDEEM_TREASURY_PUBKEY = new PublicKey('vkXyVgeQaivApFsUXLMcQcVK7FGzkhAyR73FJ5YGnnb');
export const FRACTIONAL_TREASURY_PUBKEY = new PublicKey(
  '5nxC9KnUSqr5dNQoPN7xhKfmzS48znM3zfNqcgdKYXrh',
);
export const PRICING_LOOKUP_ADDRESS_PUBKEY = new PublicKey(
  '7csPZBkT87N7x7aVrALjLBeDjCs7vcymazXVxoS3fmSf',
);
export const FRACTION_MINT_PUBKEY = new PublicKey('BjrKGZgGL7sqv5aAUxp6ZafsWGKku9UZcMioQqASSaFB');
export const FRACTION_TREASURY_PUBKEY = new PublicKey(
  '3SZUEd9qtoKCyLW8uT8z25k7kZnMmwtdLQYjQAYRZHRp',
);
export const FRACTION_MINT_AUTHORITY_PUBKEY = new PublicKey(
  '693Dn6MCsBYS4SkpSAXdhEvWNDooUHyF8KvvniEy4aBM',
);
export const TOKEN_MINT_PUBKEY = new PublicKey('8epm7eTwoEpw36QF1puxkzsRzkVp45paRXnohbPemjmK');
export const TOKEN_ACCOUNT_PUBKEY = new PublicKey('4mpzrMQo8wgBtUHDVZLPeR9i58mbHVFNT9ef8sSzUohS');
export const TOKEN_STORE_ACCOUNT_PUBKEY = new PublicKey(
  'B8ZH2ndZk1ueJvu56UNThAdjGXkfs1PyC5DwupWbwfZ3',
);
export const TRANSFER_AUTHORITY_PUBKEY = new PublicKey(
  '8azYDQNycrRkv2r7amatTy3dyD6RrSw3zZsJvymzWE3E',
);
export const SAFETY_DEPOSIT_BOX_PUBKEY = new PublicKey(
  '7pgXQDqVpiuj7TqbJKn9bW7ipg8U2uG5kY7kXNdNiTQd',
);
export const OUTSTANDING_SHARE_TOKEN_ACCOUNT_PUBKEY = new PublicKey(
  '5Q9THrE74FsopHjASfj7RLqR36RgYbKhD1shoPoDDCCZ',
);
export const OUTSTANDING_SHARES_ACCOUNT_PUBKEY = new PublicKey(
  '4Q2A27cS5DihPnerndsFZ6MxSTzjzfsjuQtS2hV3VXTT',
);
export const BURN_AUTHORITY_PUBKEY = new PublicKey('4d4xRorridzBRApmoprSaB74Tgv4TN7TqhqfUeQB2dvw');
export const NEW_VAULT_AUTHORITY_PUBKEY = new PublicKey(
  'Hi4wFQcmHKioVKvsL3NeYy9gANkZF9RQ9ZvTU7FdHP9s',
);
export const EXTERNAL_PRICE_ACCOUNT_PUBKEY = new PublicKey(
  '78qz3gehg9YqktdaYt6o56DSUPFQ41tLMACHpnFjdYdS',
);
export const PAYING_TOKEN_ACCOUNT_PUBKEY = new PublicKey(
  '8e6FHYEx7rfv1weRKrerjwuDzVn89LSjDsfXZcvWYDYW',
);
export const CURRENT_AUTHORITY_PUBKEY = new PublicKey(
  'EyBYD5b1A2xQAHJ8nUn11nHY8VrPV3Scg4mXZyjCB61f',
);
export const NEW_AUTHORITY_PUBKEY = new PublicKey('5jF6nAQ5GTK8rsdzW8hGCEsWjY9YCV2jXCwZ854BPsWz');
export const RECENT_ISH_BLOCKHASH = '9qb2wMGnvBgVdp2dhJdeo5hgko9nLHxXg7GqXPgAFYCU';
export const PROCEEDS_ACCOUNT_PUBKEY = new PublicKey(
  'GvJVHbk8pEzHwaeHeaoUrnBbsaUcDHHRVjKqP15UcShf',
);
export const SOURCE_PUBKEY = new PublicKey('4CkQJBxhU8EZ2UjhigbtdaPbpTe6mqf811fipYBFbSYN');
export const DESTINATION_PUBKEY = new PublicKey('CZXESU6tu9m4YDs2wfQFbXmjbaDtJKBgurgYzGmeoArh');

export const VAULT_EXTENRNAL_PRICE_ACCOUNT = new PublicKey(
  '58S2MNcuS79ncBc5xi1T8jdS98jcXJbXqM5UvGvgmwcr',
);

export const mockTransaction: TransactionCtorFields = {
  feePayer: new PublicKey('7J6QvJGCB22vDvYB33ikrWCXRBRsFY74ntAArSK4KJUn'),
  recentBlockhash: RECENT_ISH_BLOCKHASH,
};
export const BID_METADATA_PUBKEY = new PublicKey('CZkFeERacU42qjGTPyjamS13fNtz7y1wYLu5jyLpN1WL');
export const BID_REDEMPTION_PUBKEY = new PublicKey('4CkQJBxhU8EZ1UjhfgbtdaPbpTe6mqf811fipYBFbSYN');
export const SAFETY_DEPOSIT_TOKEN_STORE_PUBKEY = new PublicKey(
  '4CkQJBxhU8EZ1UjhfgbtdaPbpTe6mqf811fipYBFbSNM',
);
export const SAFETY_DEPOSIT_CONFIG_PUBKEY = new PublicKey(
  '4CkBUBxhU8EZ1UjhfgbtdaPbpTe6mqf811fipYBFbSNM',
);
export const NEW_EDITION_PUBKEY = new PublicKey('4CkBUBxhU8EZ1UjhfgbtdaPbpTe6mqf822fipYBFbSNM');
export const NEW_METADATA_PUBKEY = new PublicKey('5jF6nAQ5GTK8rsdzW8hGCEsWjY9YCV2jXCwZ111BPsWz');
export const EDITION_MARK_PUBKEY = new PublicKey('78qz3gehg9YqktdaYt6o71DSUPFQ41tLMACHpnFjdYdS');
export const PRIZE_TRACKING_TICKET_PUBKEY = new PublicKey(
  '78qz3gehg9YqktdaYt6o99DSUPFQ41tLMACHpnFjdYdS',
);

export const projectRoot = path.resolve(__dirname, '..', '..');
export const tmpTestDir = path.resolve(tmpdir(), 'test');

export const serializeConfig = { verifySignatures: false, requireAllSignatures: false };
export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getUserKeypairFromFile(keypairPath: string) {
  const arr = readFileSync(path.resolve(keypairPath), {
    encoding: 'utf-8',
  });
  const u8Array = Uint8Array.from(JSON.parse(arr));
  return Keypair.fromSecretKey(u8Array);
}
