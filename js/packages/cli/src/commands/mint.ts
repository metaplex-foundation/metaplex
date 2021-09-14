import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  getCandyMachineAddress,
  getMasterEdition,
  getMetadata,
  getTokenWallet,
  loadAnchorProgram,
  loadWalletKey,
  uuidFromConfigPubkey
} from "../helpers/accounts";
import { TOKEN_METADATA_PROGRAM_ID, TOKEN_PROGRAM_ID } from "../helpers/constants";
import * as anchor from "@project-serum/anchor";
import { MintLayout, Token } from "@solana/spl-token";
import { createAssociatedTokenAccountInstruction } from "../helpers/instructions";

export async function mint(keypair: string, env: string, configAddress: PublicKey, splTokenAccountKey?: PublicKey): Promise<string> {
  const mint = Keypair.generate();

  const userKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadAnchorProgram(userKeyPair, env);
  const userTokenAccountAddress = await getTokenWallet(
    userKeyPair.publicKey,
    mint.publicKey,
  );

  const uuid = uuidFromConfigPubkey(configAddress);
  const [candyMachineAddress] = await getCandyMachineAddress(
    configAddress,
    uuid,
  );
  const candyMachine : any = await anchorProgram.account.candyMachine.fetch(
    candyMachineAddress,
  );

  const remainingAccounts = [];
  if (splTokenAccountKey) {
    const candyMachineTokenMintKey = candyMachine.tokenMint;
    if (!candyMachineTokenMintKey) {
      throw new Error('Candy machine data does not have token mint configured. Can\'t use spl-token-account');
    }
    const token = new Token(
      anchorProgram.provider.connection,
      candyMachine.tokenMint,
      TOKEN_PROGRAM_ID,
      userKeyPair
    );

    const tokenAccount = await token.getAccountInfo(splTokenAccountKey);
    if (!candyMachine.tokenMint.equals(tokenAccount.mint)) {
      throw new Error(`Specified spl-token-account's mint (${tokenAccount.mint.toString()}) does not match candy machine's token mint (${candyMachine.tokenMint.toString()})`);
    }

    if (!tokenAccount.owner.equals(userKeyPair.publicKey)) {
      throw new Error(`Specified spl-token-account's owner (${tokenAccount.owner.toString()}) does not match user public key (${userKeyPair.publicKey})`);
    }

    remainingAccounts.push({ pubkey: splTokenAccountKey, isWritable: true, isSigner: false });
    remainingAccounts.push({ pubkey: userKeyPair.publicKey, isWritable: false, isSigner: true });
  }

  const metadataAddress = await getMetadata(mint.publicKey);
  const masterEdition = await getMasterEdition(mint.publicKey);
  return await anchorProgram.rpc.mintNft({
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
    signers: [mint, userKeyPair],
    remainingAccounts,
    instructions: [
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
    ],
  });
}
