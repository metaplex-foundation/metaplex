import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import {
  getAtaForMint,
  getCandyMachineAddress,
  getCandyMachineCreator,
  getCollectionAuthorityRecordPDA,
  getCollectionPDA,
  getMasterEdition,
  getMetadata,
  getTokenWallet,
  loadCandyProgram,
  loadCandyProgramV2,
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

export async function mintV2(
  keypair: string,
  env: string,
  candyMachineAddress: PublicKey,
  rpcUrl: string,
): Promise<string> {
  const mint = Keypair.generate();

  const userKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadCandyProgramV2(userKeyPair, env, rpcUrl);
  const userTokenAccountAddress = await getTokenWallet(
    userKeyPair.publicKey,
    mint.publicKey,
  );

  const candyMachine: any = await anchorProgram.account.candyMachine.fetch(
    candyMachineAddress,
  );
  const remainingAccounts = [];
  const signers = [mint, userKeyPair];
  const cleanupInstructions = [];
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

  if (candyMachine.data.whitelistMintSettings) {
    const mint = new anchor.web3.PublicKey(
      candyMachine.data.whitelistMintSettings.mint,
    );

    const whitelistToken = (
      await getAtaForMint(mint, userKeyPair.publicKey)
    )[0];
    remainingAccounts.push({
      pubkey: whitelistToken,
      isWritable: true,
      isSigner: false,
    });

    if (candyMachine.data.whitelistMintSettings.mode.burnEveryTime) {
      const whitelistBurnAuthority = anchor.web3.Keypair.generate();

      remainingAccounts.push({
        pubkey: mint,
        isWritable: true,
        isSigner: false,
      });
      remainingAccounts.push({
        pubkey: whitelistBurnAuthority.publicKey,
        isWritable: false,
        isSigner: true,
      });
      signers.push(whitelistBurnAuthority);
      const exists = await anchorProgram.provider.connection.getAccountInfo(
        whitelistToken,
      );
      if (exists) {
        instructions.push(
          Token.createApproveInstruction(
            TOKEN_PROGRAM_ID,
            whitelistToken,
            whitelistBurnAuthority.publicKey,
            userKeyPair.publicKey,
            [],
            1,
          ),
        );
        cleanupInstructions.push(
          Token.createRevokeInstruction(
            TOKEN_PROGRAM_ID,
            whitelistToken,
            userKeyPair.publicKey,
            [],
          ),
        );
      }
    }
  }

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
      pubkey: transferAuthority.publicKey,
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
    signers.push(transferAuthority);
    cleanupInstructions.push(
      Token.createRevokeInstruction(
        TOKEN_PROGRAM_ID,
        tokenAccount,
        userKeyPair.publicKey,
        [],
      ),
    );
  }
  const metadataAddress = await getMetadata(mint.publicKey);
  const masterEdition = await getMasterEdition(mint.publicKey);

  const collectionPDA = (await getCollectionPDA(candyMachineAddress))[0];
  const collectionPDAAccount =
    await anchorProgram.provider.connection.getAccountInfo(collectionPDA);

  if (collectionPDAAccount) {
    try {
      const collectionMint = (await anchorProgram.account.collectionPda.fetch(
        collectionPDA,
      )) as { mint: PublicKey };
      const collectionAuthorityRecord = (
        await getCollectionAuthorityRecordPDA(
          collectionMint.mint,
          collectionPDA,
        )
      )[0];
      if (collectionMint) {
        const collectionMetadata = await getMetadata(collectionMint.mint);
        const collectionMasterEdition = await getMasterEdition(
          collectionMint.mint,
        );
        remainingAccounts.push(
          ...[
            {
              pubkey: collectionPDA,
              isWritable: true,
              isSigner: false,
            },
            {
              pubkey: collectionMint.mint,
              isWritable: false,
              isSigner: false,
            },
            {
              pubkey: collectionMetadata,
              isWritable: true,
              isSigner: false,
            },
            {
              pubkey: collectionMasterEdition,
              isWritable: false,
              isSigner: false,
            },
            {
              pubkey: collectionAuthorityRecord,
              isWritable: false,
              isSigner: false,
            },
          ],
        );
      }
    } catch (error) {
      console.error(error);
    }
  }
  console.log(remainingAccounts.map(i => i.pubkey.toBase58()));
  const [candyMachineCreator, creatorBump] = await getCandyMachineCreator(
    candyMachineAddress,
  );
  instructions.push(
    await anchorProgram.instruction.mintNft(creatorBump, {
      accounts: {
        candyMachine: candyMachineAddress,
        candyMachineCreator,
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
        recentBlockhashes: anchor.web3.SYSVAR_SLOT_HASHES_PUBKEY,
        instructionSysvarAccount: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      remainingAccounts:
        remainingAccounts.length > 0 ? remainingAccounts : undefined,
    }),
  );

  const finished = (
    await sendTransactionWithRetryWithKeypair(
      anchorProgram.provider.connection,
      userKeyPair,
      instructions,
      signers,
    )
  ).txid;

  await sendTransactionWithRetryWithKeypair(
    anchorProgram.provider.connection,
    userKeyPair,
    cleanupInstructions,
    [],
  );

  return finished;
}
