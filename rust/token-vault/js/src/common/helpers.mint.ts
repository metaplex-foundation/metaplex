// Lifted from solana-labs/spl/token/ts/src/state/mint.ts
// Should be removed once these functions are exported from the spl-token module.

import { MintLayout, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Commitment, Connection, PublicKey } from '@solana/web3.js';

export interface Mint {
  /** Address of the mint */
  address: PublicKey;
  /**
   * Optional authority used to mint new tokens. The mint authority may only be provided during mint creation.
   * If no mint authority is present then the mint has a fixed supply and no further tokens may be minted.
   */
  mintAuthority: PublicKey | null;
  /** Total supply of tokens */
  supply: bigint;
  /** Number of base 10 digits to the right of the decimal place */
  decimals: number;
  /** Is this mint initialized */
  isInitialized: boolean;
  /** Optional authority to freeze token accounts */
  freezeAuthority: PublicKey | null;
}

/** Base class for errors */
export abstract class TokenError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

/** Thrown if an account is not found at the expected address */
export class TokenAccountNotFoundError extends TokenError {
  name = 'TokenAccountNotFoundError';
}
export class TokenInvalidAccountOwnerError extends TokenError {
  name = 'TokenInvalidAccountOwnerError';
}

/** Thrown if the byte length of an program state account doesn't match the expected size */
export class TokenInvalidAccountSizeError extends TokenError {
  name = 'TokenInvalidAccountSizeError';
}

export const MINT_SIZE = MintLayout.span;

/**
 * Retrieve information about a mint
 *
 * @param connection Connection to use
 * @param address    Mint account
 * @param commitment Desired level of commitment for querying the state
 * @param programId  SPL Token program account
 *
 * @return Mint information
 */
export async function getMint(
  connection: Connection,
  address: PublicKey,
  commitment?: Commitment,
  programId = TOKEN_PROGRAM_ID,
): Promise<Mint> {
  const info = await connection.getAccountInfo(address, commitment);
  if (info == null) throw new TokenAccountNotFoundError();
  if (!info.owner.equals(programId)) throw new TokenInvalidAccountOwnerError();
  if (info.data.length != MINT_SIZE) throw new TokenInvalidAccountSizeError();

  const rawMint = MintLayout.decode(info.data);

  return {
    address,
    mintAuthority: rawMint.mintAuthorityOption ? rawMint.mintAuthority : null,
    supply: rawMint.supply,
    decimals: rawMint.decimals,
    isInitialized: rawMint.isInitialized,
    freezeAuthority: rawMint.freezeAuthorityOption ? rawMint.freezeAuthority : null,
  };
}
