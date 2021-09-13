import { MintLayout, AccountLayout, Token } from '@solana/spl-token';
import { Connection, PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { sendTransaction, WalletSender } from '../contexts';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

export const mintNFT = async (
  connection: Connection,
  wallet: WalletSender,
  // SOL account
  owner: PublicKey,
) => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const TOKEN_PROGRAM_ID = new PublicKey(
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  );
  //const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
  //  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  //);
  const mintAccount = new Keypair();
  const tokenAccount = new Keypair();

  // Allocate memory for the account
  const mintRent = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );

  const accountRent = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );

  const instructions = [
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mintAccount.publicKey,
      lamports: mintRent,
      space: MintLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }),
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: tokenAccount.publicKey,
      lamports: accountRent,
      space: AccountLayout.span,
      programId: TOKEN_PROGRAM_ID,
    }),
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      mintAccount.publicKey,
      0,
      wallet.publicKey,
      wallet.publicKey,
    ),
    Token.createInitAccountInstruction(
      TOKEN_PROGRAM_ID,
      mintAccount.publicKey,
      tokenAccount.publicKey,
      owner,
    ),
    Token.createMintToInstruction(
      TOKEN_PROGRAM_ID,
      mintAccount.publicKey,
      tokenAccount.publicKey,
      wallet.publicKey,
      [],
      1,
    ),
    Token.createSetAuthorityInstruction(
      TOKEN_PROGRAM_ID,
      mintAccount.publicKey,
      null,
      'MintTokens',
      wallet.publicKey,
      [],
    ),
  ];

  const signers = [mintAccount, tokenAccount];

  const { txid } = await sendTransaction(
    connection,
    wallet,
    instructions,
    signers,
  );

  return { txid, mint: mintAccount.publicKey, account: tokenAccount.publicKey };
};
