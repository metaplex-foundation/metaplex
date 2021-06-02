import { AccountLayout, MintLayout, Token } from '@solana/spl-token';
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  programIds,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  WRAPPED_SOL_MINT,
} from '../utils/ids';
import { TokenAccount } from '../models/account';
import { cache, TokenAccountParser } from '../contexts/accounts';

export function ensureSplAccount(
  instructions: TransactionInstruction[],
  cleanupInstructions: TransactionInstruction[],
  toCheck: TokenAccount,
  payer: PublicKey,
  amount: number,
  signers: Keypair[],
) {
  if (!toCheck.info.isNative) {
    return toCheck.pubkey;
  }

  const account = createUninitializedAccount(
    instructions,
    payer,
    amount,
    signers,
  );

  instructions.push(
    Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      WRAPPED_SOL_MINT,
      account,
      payer,
    ),
  );

  cleanupInstructions.push(
    Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      account,
      payer,
      payer,
      [],
    ),
  );

  return account;
}

export const DEFAULT_TEMP_MEM_SPACE = 65548;

export function createTempMemoryAccount(
  instructions: TransactionInstruction[],
  payer: PublicKey,
  signers: Keypair[],
  owner: PublicKey,
  space = DEFAULT_TEMP_MEM_SPACE,
) {
  const account = Keypair.generate();
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: account.publicKey,
      // 0 will evict/close account since it cannot pay rent
      lamports: 0,
      space: space,
      programId: owner,
    }),
  );

  signers.push(account);

  return account.publicKey;
}

export function createUninitializedMint(
  instructions: TransactionInstruction[],
  payer: PublicKey,
  amount: number,
  signers: Keypair[],
) {
  const account = Keypair.generate();
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: account.publicKey,
      lamports: amount,
      space: MintLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }),
  );

  signers.push(account);

  return account.publicKey;
}

export function createUninitializedAccount(
  instructions: TransactionInstruction[],
  payer: PublicKey,
  amount: number,
  signers: Keypair[],
) {
  const account = Keypair.generate();
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: account.publicKey,
      lamports: amount,
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }),
  );

  signers.push(account);

  return account.publicKey;
}

export function createAssociatedTokenAccountInstruction(
  instructions: TransactionInstruction[],
  associatedTokenAddress: PublicKey,
  payer: PublicKey,
  walletAddress: PublicKey,
  splTokenMintAddress: PublicKey,
) {
  const keys = [
    {
      pubkey: payer,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: associatedTokenAddress,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: walletAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: splTokenMintAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
      data: Buffer.from([]),
    }),
  );
}

export function createMint(
  instructions: TransactionInstruction[],
  payer: PublicKey,
  mintRentExempt: number,
  decimals: number,
  owner: PublicKey,
  freezeAuthority: PublicKey,
  signers: Keypair[],
) {
  const account = createUninitializedMint(
    instructions,
    payer,
    mintRentExempt,
    signers,
  );

  instructions.push(
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      account,
      decimals,
      owner,
      freezeAuthority,
    ),
  );

  return account;
}

export function createTokenAccount(
  instructions: TransactionInstruction[],
  payer: PublicKey,
  accountRentExempt: number,
  mint: PublicKey,
  owner: PublicKey,
  signers: Keypair[],
) {
  const account = createUninitializedAccount(
    instructions,
    payer,
    accountRentExempt,
    signers,
  );

  instructions.push(
    Token.createInitAccountInstruction(TOKEN_PROGRAM_ID, mint, account, owner),
  );

  return account;
}

export function ensureWrappedAccount(
  instructions: TransactionInstruction[],
  cleanupInstructions: TransactionInstruction[],
  toCheck: TokenAccount | undefined,
  payer: PublicKey,
  amount: number,
  signers: Keypair[],
) {
  if (toCheck && !toCheck.info.isNative) {
    return toCheck.pubkey;
  }

  const TOKEN_PROGRAM_ID = programIds().token;
  const account = Keypair.generate();
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: account.publicKey,
      lamports: amount,
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }),
  );

  instructions.push(
    Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      WRAPPED_SOL_MINT,
      account.publicKey,
      payer,
    ),
  );

  cleanupInstructions.push(
    Token.createCloseAccountInstruction(
      TOKEN_PROGRAM_ID,
      account.publicKey,
      payer,
      payer,
      [],
    ),
  );

  signers.push(account);

  return account.publicKey;
}

// TODO: check if one of to accounts needs to be native sol ... if yes unwrap it ...
export function findOrCreateAccountByMint(
  payer: PublicKey,
  owner: PublicKey,
  instructions: TransactionInstruction[],
  cleanupInstructions: TransactionInstruction[],
  accountRentExempt: number,
  mint: PublicKey, // use to identify same type
  signers: Keypair[],
  excluded?: Set<string>,
): PublicKey {
  const accountToFind = mint.toBase58();
  const account = cache
    .byParser(TokenAccountParser)
    .map(id => cache.get(id))
    .find(
      acc =>
        acc !== undefined &&
        acc.info.mint.toBase58() === accountToFind &&
        acc.info.owner.toBase58() === owner.toBase58() &&
        (excluded === undefined || !excluded.has(acc.pubkey.toBase58())),
    );
  const isWrappedSol = accountToFind === WRAPPED_SOL_MINT.toBase58();

  let toAccount: PublicKey;
  if (account && !isWrappedSol) {
    toAccount = account.pubkey;
  } else {
    // creating depositor pool account
    toAccount = createTokenAccount(
      instructions,
      payer,
      accountRentExempt,
      mint,
      owner,
      signers,
    );

    if (isWrappedSol) {
      cleanupInstructions.push(
        Token.createCloseAccountInstruction(
          TOKEN_PROGRAM_ID,
          toAccount,
          payer,
          payer,
          [],
        ),
      );
    }
  }

  return toAccount;
}
