// -----------------
// Token account functions not yet released adapted to use beet
/// Lifted from: solana-labs/spl/token/ts/src/state/account.ts
// -----------------
// TODO(thlorenz): remove and use released ones once we can

import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Commitment, Connection, PublicKey } from '@solana/web3.js';
import * as beet from '@metaplex-foundation/beet';
import * as beetSolana from '@metaplex-foundation/beet-solana';
import { strict as assert } from 'assert';

// TokenLayout isn't exposed in the current lib, so we need to implement all of the below

export enum AccountState {
  Uninitialized = 0,
  Initialized = 1,
  Frozen = 2,
}

/** Information about a token account */
export interface Account {
  /** Address of the account */
  address: PublicKey;
  /** Mint associated with the account */
  mint: PublicKey;
  /** Owner of the account */
  owner: PublicKey;
  /** Number of tokens the account holds */
  amount: beet.bignum;

  delegateOption: 1 | 0;

  /** Authority that can transfer tokens from the account */
  delegate: beet.COption<PublicKey>;
  /** Number of tokens the delegate is authorized to transfer */
  delegatedAmount: beet.bignum;
  /** True if the account is initialized */
  isInitialized: boolean;
  /** True if the account is frozen */
  isFrozen: boolean;

  state: AccountState;
  isNativeOption: beet.COption<boolean>;

  /** True if the account is a native token account */
  isNative: boolean;
  /**
   * If the account is a native token account, it must be rent-exempt. The rent-exempt reserve
   * is the amount that must remain in the balance until the account is closed.
   */
  rentExemptReserve: beet.COption<boolean>;

  closeAuthorityOption: beet.COption<boolean>;
  /** Optional authority to close the account */
  closeAuthority: beet.COption<PublicKey>;
}

const AccountBeet = new beet.BeetStruct<Account>(
  [
    ['mint', beetSolana.publicKey],
    ['owner', beetSolana.publicKey],
    ['amount', beet.u64],
    ['delegateOption', beet.u32],
    ['delegate', beetSolana.publicKey],
    ['state', beet.fixedScalarEnum(AccountState) as beet.FixedSizeBeet<AccountState, AccountState>],
    ['isNativeOption', beet.u32],
    ['isNative', beet.u64],
    ['delegatedAmount', beet.u64],
    ['closeAuthorityOption', beet.u32],
    ['closeAuthority', beetSolana.publicKey],
  ],
  (args) => args as Account,
);
const ACCOUNT_SIZE = AccountBeet.byteSize;

/**
 * Retrieve information about a token account
 *
 * @param connection Connection to use
 * @param address    Token account
 * @param commitment Desired level of commitment for querying the state
 * @param programId  SPL Token program account
 *
 * @return Token account information
 */
export async function getAccount(
  connection: Connection,
  address: PublicKey,
  commitment?: Commitment,
  programId = TOKEN_PROGRAM_ID,
): Promise<Partial<Account>> {
  const info = await connection.getAccountInfo(address, commitment);
  assert(info != null, 'should find token');
  assert(info.owner.equals(programId), 'should have valid token owner');
  assert.equal(info.data.length, ACCOUNT_SIZE, 'should have valid size');

  const rawAccount = AccountBeet.read(info.data, 0);

  return {
    address,
    mint: rawAccount.mint,
    owner: rawAccount.owner,
    amount: rawAccount.amount,
    delegate: rawAccount.delegateOption ? rawAccount.delegate : null,
    delegatedAmount: rawAccount.delegatedAmount,
    isInitialized: rawAccount.state !== AccountState.Uninitialized,
    isFrozen: rawAccount.state === AccountState.Frozen,
    isNative: !!rawAccount.isNativeOption,
    rentExemptReserve: rawAccount.isNativeOption,
    closeAuthority: rawAccount.closeAuthorityOption ? rawAccount.closeAuthority : null,
  };
}
