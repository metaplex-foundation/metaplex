import {
  MintLayout,
  AccountLayout,
  Token,
  AuthorityType,
} from '@solana/spl-token';
import {
  Connection,
  PublicKey,
  Transaction,
  Account,
  SystemProgram,
} from '@solana/web3.js';

export const mintNFT = async (
  connection: Connection,
  wallet: {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Transaction;
  },
  // SOL account
  owner: PublicKey,
) => {
  const TOKEN_PROGRAM_ID = new PublicKey(
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  );
  const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  );
  const mintAccount = new Account();
  const tokenAccount = new Account();

  // Allocate memory for the account
  const mintRent = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );

  const accountRent = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );

  let transaction = new Transaction();
  const signers = [mintAccount, tokenAccount];
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash('max')
  ).blockhash;

  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mintAccount.publicKey,
      lamports: mintRent,
      space: MintLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }),
  );

  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: tokenAccount.publicKey,
      lamports: accountRent,
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }),
  );

  transaction.add(
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      mintAccount.publicKey,
      0,
      wallet.publicKey,
      wallet.publicKey,
    ),
  );
  transaction.add(
    Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      mintAccount.publicKey,
      tokenAccount.publicKey,
      owner,
    ),
  );
  transaction.add(
    Token.createMintToInstruction(
      TOKEN_PROGRAM_ID,
      mintAccount.publicKey,
      tokenAccount.publicKey,
      wallet.publicKey,
      [],
      1,
    ),
  );
  transaction.add(
    Token.createSetAuthorityInstruction(
      TOKEN_PROGRAM_ID,
      mintAccount.publicKey,
      null,
      'MintTokens',
      wallet.publicKey,
      [],
    ),
  );

  transaction.setSigners(wallet.publicKey, ...signers.map(s => s.publicKey));
  if (signers.length > 0) {
    transaction.partialSign(...signers);
  }
  transaction = await wallet.signTransaction(transaction);
  const rawTransaction = transaction.serialize();
  let options = {
    skipPreflight: true,
    commitment: 'singleGossip',
  };

  const txid = await connection.sendRawTransaction(rawTransaction, options);

  return { txid, mint: mintAccount.publicKey, account: tokenAccount.publicKey };
};
