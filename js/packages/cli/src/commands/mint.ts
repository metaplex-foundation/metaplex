import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import {
  getCandyMachineAddress,
  getMasterEdition,
  getMetadata,
  getTokenWallet,
  loadCandyProgram,
  loadWalletKey,
} from '../helpers/accounts';
import {
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '../helpers/constants';
import * as anchor from '@project-serum/anchor';
import { MintLayout, Token } from '@solana/spl-token';
import { createAssociatedTokenAccountInstruction } from '../helpers/instructions';
import { sendTransactionWithRetryWithKeypair } from '../helpers/transactions';

export async function mint(
  keypair: string,
  env: string,
  configAddress: PublicKey,
  uuid: string,
  rpcUrl: string,
): Promise<string> {
  const mint = Keypair.generate();

  const userKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadCandyProgram(userKeyPair, env, rpcUrl);
  const userTokenAccountAddress = await getTokenWallet(
    userKeyPair.publicKey,
    mint.publicKey,
  );

  const [candyMachineAddress] = await getCandyMachineAddress(
    configAddress,
    uuid,
  );
  const candyMachine: any = await anchorProgram.account.candyMachine.fetch(
    candyMachineAddress,
  );

  const remainingAccounts = [];
  const signers = [mint, userKeyPair];
  const instructions = [
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: userKeyPair.publicKey,
      newAccountPubkey: mint.publicKey,
      space: MintLayout.span,
      lamports:
        await anchorProgram.provider.connection.getMinimumBalanceForRentExemption(
          MintLayout.span,
        ),
      programId: TOKEN_PROGRAM_ID,
    }),
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      0,
      userKeyPair.publicKey,
      userKeyPair.publicKey,
    ),
    createAssociatedTokenAccountInstruction(
      userTokenAccountAddress,
      userKeyPair.publicKey,
      userKeyPair.publicKey,
      mint.publicKey,
    ),
    Token.createMintToInstruction(
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      userTokenAccountAddress,
      userKeyPair.publicKey,
      [],
      1,
    ),
  ];

  let tokenAccount;
  if (candyMachine.tokenMint) {
    const transferAuthority = anchor.web3.Keypair.generate();

    tokenAccount = await getTokenWallet(
      userKeyPair.publicKey,
      candyMachine.tokenMint,
    );

    remainingAccounts.push({
      pubkey: tokenAccount,
      isWritable: true,
      isSigner: false,
    });
    remainingAccounts.push({
      pubkey: userKeyPair.publicKey,
      isWritable: false,
      isSigner: true,
    });

    instructions.push(
      Token.createApproveInstruction(
        TOKEN_PROGRAM_ID,
        tokenAccount,
        transferAuthority.publicKey,
        userKeyPair.publicKey,
        [],
        candyMachine.data.price.toNumber(),
      ),
    );
  }
  const metadataAddress = await getMetadata(mint.publicKey);
  const masterEdition = await getMasterEdition(mint.publicKey);

  instructions.push(
    await anchorProgram.instruction.mintNft({
      accounts: {
        config: configAddress,
        candyMachine: candyMachineAddress,
        payer: userKeyPair.publicKey,
        //@ts-ignore
        wallet: candyMachine.wallet,
        mint: mint.publicKey,
        metadata: metadataAddress,
        masterEdition,
        mintAuthority: userKeyPair.publicKey,
        updateAuthority: userKeyPair.publicKey,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      remainingAccounts,
    }),
  );

  if (tokenAccount) {
    instructions.push(
      Token.createRevokeInstruction(
        TOKEN_PROGRAM_ID,
        tokenAccount,
        userKeyPair.publicKey,
        [],
      ),
    );
  }

  return (
    await sendTransactionWithRetryWithKeypair(
      anchorProgram.provider.connection,
      userKeyPair,
      instructions,
      signers,
    )
  ).txid;
}
