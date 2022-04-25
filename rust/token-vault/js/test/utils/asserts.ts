import { Test } from 'tape';
import { bignum, COption } from '@metaplex-foundation/beet';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import spok, { Specification, Specifications } from 'spok';
import { TokenBalances } from '@metaplex-foundation/amman';
import { addressLabels } from './address-labels';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Assert = {
  equal(actual: any, expected: any, msg?: string): void;
  deepEqual(actual: any, expected: any, msg?: string): void;
  ok(value: any, msg?: string): void;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export function assertSamePubkey(t: Assert, a: PublicKey | COption<PublicKey>, b: PublicKey) {
  t.equal(a?.toBase58(), b.toBase58(), 'pubkeys are same');
}

export function spokSamePubkey(a: PublicKey | COption<PublicKey>): Specifications<PublicKey> {
  const same = (b: PublicKey | null | undefined) => b != null && !!a?.equals(b);

  same.$spec = `spokSamePubkey(${a?.toBase58()})`;
  same.$description = `${a?.toBase58()} equal`;
  return same;
}

export function spokSameBignum(a: BN | bignum): Specification<bignum> {
  const same = (b?: BN | bignum) => b != null && new BN(a).eq(new BN(b));

  same.$spec = `spokSameBignum(${a})`;
  same.$description = `${a} equal`;
  return same;
}

export function assertIsNotNull<T>(t: Test, x: T | null | undefined): asserts x is T {
  t.ok(x, 'should be non null');
}

export async function verifyTokenBalance(
  t: Test,
  tokens: TokenBalances,
  account: PublicKey,
  mint: PublicKey,
  pre: bignum,
  post: bignum,
) {
  const balance = await tokens.balance(account, mint);
  assertIsNotNull(t, balance);
  spok(t, balance, {
    $topic: addressLabels.resolve(account),
    amountPre: spokSameBignum(pre),
    amountPost: spokSameBignum(post),
  });
}
