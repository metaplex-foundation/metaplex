import * as anchor from '@project-serum/anchor';

import { MintLayout, TOKEN_PROGRAM_ID, Token } from '@solana/spl-token';
import { SystemProgram } from '@solana/web3.js';
import { sendTransactions } from './connection';

import {
  CIVIC,
  getAtaForMint,
  getNetworkExpire,
  getNetworkToken,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
} from './utils';

export const CANDY_MACHINE_PROGRAM = new anchor.web3.PublicKey(
  'cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ',
);

const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

interface CandyMachineState {
  itemsAvailable: number;
  itemsRedeemed: number;
  itemsRemaining: number;
  treasury: anchor.web3.PublicKey;
  tokenMint: anchor.web3.PublicKey;
  isSoldOut: boolean;
  isActive: boolean;
  goLiveDate: anchor.BN;
  price: anchor.BN;
  gatekeeper: null | {
    expireOnUse: boolean;
    gatekeeperNetwork: anchor.web3.PublicKey;
  };
  endSettings: null | [number, anchor.BN];
  whitelistMintSettings: null | {
    mode: any;
    mint: anchor.web3.PublicKey;
    presale: boolean;
    discountPrice: null | anchor.BN;
  };
  hiddenSettings: null | {
    name: string;
    uri: string;
    hash: Uint8Array;
  };
}

export interface CandyMachineAccount {
  id: anchor.web3.PublicKey;
  program: anchor.Program;
  state: CandyMachineState;
}

export const awaitTransactionSignatureConfirmation = async (
  txid: anchor.web3.TransactionSignature,
  timeout: number,
  connection: anchor.web3.Connection,
  queryStatus = false,
): Promise<anchor.web3.SignatureStatus | null | void> => {
  let done = false;
  let status: anchor.web3.SignatureStatus | null | void = {
    slot: 0,
    confirmations: 0,
    err: null,
  };
  let subId = 0;
  status = await new Promise(async (resolve, reject) => {
    setTimeout(() => {
      if (done) {
        return;
      }
      done = true;
      console.log('Rejecting for timeout...');
      reject({ timeout: true });
    }, timeout);

    while (!done && queryStatus) {
      // eslint-disable-next-line no-loop-func
      (async () => {
        try {
          const signatureStatuses = await connection.getSignatureStatuses([
            txid,
          ]);
          status = signatureStatuses && signatureStatuses.value[0];
          if (!done) {
            if (!status) {
              console.log('REST null result for', txid, status);
            } else if (status.err) {
              console.log('REST error for', txid, status);
              done = true;
              reject(status.err);
            } else if (!status.confirmations) {
              console.log('REST no confirmations for', txid, status);
            } else {
              console.log('REST confirmation for', txid, status);
              done = true;
              resolve(status);
            }
          }
        } catch (e) {
          if (!done) {
            console.log('REST connection error: txid', txid, e);
          }
        }
      })();
      await sleep(2000);
    }
  });

  //@ts-ignore
  if (connection._signatureSubscriptions[subId]) {
    connection.removeSignatureListener(subId);
  }
  done = true;
  console.log('Returning status', status);
  return status;
};

const createAssociatedTokenAccountInstruction = (
  associatedTokenAddress: anchor.web3.PublicKey,
  payer: anchor.web3.PublicKey,
  walletAddress: anchor.web3.PublicKey,
  splTokenMintAddress: anchor.web3.PublicKey,
) => {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
    { pubkey: walletAddress, isSigner: false, isWritable: false },
    { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
    {
      pubkey: anchor.web3.SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: anchor.web3.SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new anchor.web3.TransactionInstruction({
    keys,
    programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    data: Buffer.from([]),
  });
};

export const getCandyMachineState = async (
  anchorWallet: anchor.Wallet,
  candyMachineId: anchor.web3.PublicKey,
  connection: anchor.web3.Connection,
): Promise<CandyMachineAccount> => {
  const provider = new anchor.Provider(connection, anchorWallet, {
    preflightCommitment: 'recent',
  });

  const idl = await anchor.Program.fetchIdl(CANDY_MACHINE_PROGRAM, provider);

  const program = new anchor.Program(idl, CANDY_MACHINE_PROGRAM, provider);

  const state: any = await program.account.candyMachine.fetch(candyMachineId);
  const itemsAvailable = state.data.itemsAvailable.toNumber();
  const itemsRedeemed = state.itemsRedeemed.toNumber();
  const itemsRemaining = itemsAvailable - itemsRedeemed;

  return {
    id: candyMachineId,
    program,
    state: {
      itemsAvailable,
      itemsRedeemed,
      itemsRemaining,
      isSoldOut: itemsRemaining === 0,
      isActive:
        state.data.goLiveDate.toNumber() < new Date().getTime() / 1000 &&
        (state.endSettings
          ? state.endSettings.endSettingType.date
            ? state.endSettings.number.toNumber() > new Date().getTime() / 1000
            : itemsRedeemed < state.endSettings.number.toNumber()
          : true),
      goLiveDate: state.data.goLiveDate,
      treasury: state.wallet,
      tokenMint: state.tokenMint,
      gatekeeper: state.data.gatekeeper,
      endSettings: state.data.endSettings,
      whitelistMintSettings: state.data.whitelistMintSettings,
      hiddenSettings: state.data.hiddenSettings,
      price: state.data.price,
    },
  };
};

const getMasterEdition = async (
  mint: anchor.web3.PublicKey,
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

const getMetadata = async (
  mint: anchor.web3.PublicKey,
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

export const getCandyMachineCreator = async (
  candyMachine: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('candy_machine'), candyMachine.toBuffer()],
    CANDY_MACHINE_PROGRAM,
  );
};

export const mintOneToken = async (
  candyMachine: CandyMachineAccount,
  payer: anchor.web3.PublicKey,
): Promise<(string | undefined)[]> => {
  const mint = anchor.web3.Keypair.generate();

  const userTokenAccountAddress = (
    await getAtaForMint(mint.publicKey, payer)
  )[0];

  const userPayingAccountAddress = candyMachine.state.tokenMint
    ? (await getAtaForMint(candyMachine.state.tokenMint, payer))[0]
    : payer;

  const candyMachineAddress = candyMachine.id;
  const remainingAccounts = [];
  const signers: anchor.web3.Keypair[] = [mint];
  const cleanupInstructions = [];
  const instructions = [
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint.publicKey,
      space: MintLayout.span,
      lamports:
        await candyMachine.program.provider.connection.getMinimumBalanceForRentExemption(
          MintLayout.span,
        ),
      programId: TOKEN_PROGRAM_ID,
    }),
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      0,
      payer,
      payer,
    ),
    createAssociatedTokenAccountInstruction(
      userTokenAccountAddress,
      payer,
      payer,
      mint.publicKey,
    ),
    Token.createMintToInstruction(
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      userTokenAccountAddress,
      payer,
      [],
      1,
    ),
  ];

  if (candyMachine.state.gatekeeper) {
    remainingAccounts.push({
      pubkey: (
        await getNetworkToken(
          payer,
          candyMachine.state.gatekeeper.gatekeeperNetwork,
        )
      )[0],
      isWritable: true,
      isSigner: false,
    });
    if (candyMachine.state.gatekeeper.expireOnUse) {
      remainingAccounts.push({
        pubkey: CIVIC,
        isWritable: false,
        isSigner: false,
      });
      remainingAccounts.push({
        pubkey: (
          await getNetworkExpire(
            candyMachine.state.gatekeeper.gatekeeperNetwork,
          )
        )[0],
        isWritable: false,
        isSigner: false,
      });
    }
  }
  if (candyMachine.state.whitelistMintSettings) {
    const mint = new anchor.web3.PublicKey(
      candyMachine.state.whitelistMintSettings.mint,
    );

    const whitelistToken = (await getAtaForMint(mint, payer))[0];
    remainingAccounts.push({
      pubkey: whitelistToken,
      isWritable: true,
      isSigner: false,
    });

    if (candyMachine.state.whitelistMintSettings.mode.burnEveryTime) {
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
      const exists =
        await candyMachine.program.provider.connection.getAccountInfo(
          whitelistToken,
        );
      if (exists) {
        instructions.push(
          Token.createApproveInstruction(
            TOKEN_PROGRAM_ID,
            whitelistToken,
            whitelistBurnAuthority.publicKey,
            payer,
            [],
            1,
          ),
        );
        cleanupInstructions.push(
          Token.createRevokeInstruction(
            TOKEN_PROGRAM_ID,
            whitelistToken,
            payer,
            [],
          ),
        );
      }
    }
  }

  if (candyMachine.state.tokenMint) {
    const transferAuthority = anchor.web3.Keypair.generate();

    signers.push(transferAuthority);
    remainingAccounts.push({
      pubkey: userPayingAccountAddress,
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
        userPayingAccountAddress,
        transferAuthority.publicKey,
        payer,
        [],
        candyMachine.state.price.toNumber(),
      ),
    );
    cleanupInstructions.push(
      Token.createRevokeInstruction(
        TOKEN_PROGRAM_ID,
        userPayingAccountAddress,
        payer,
        [],
      ),
    );
  }
  const metadataAddress = await getMetadata(mint.publicKey);
  const masterEdition = await getMasterEdition(mint.publicKey);

  const [candyMachineCreator, creatorBump] = await getCandyMachineCreator(
    candyMachineAddress,
  );

  instructions.push(
    await candyMachine.program.instruction.mintNft(creatorBump, {
      accounts: {
        candyMachine: candyMachineAddress,
        candyMachineCreator,
        payer: payer,
        wallet: candyMachine.state.treasury,
        mint: mint.publicKey,
        metadata: metadataAddress,
        masterEdition,
        mintAuthority: payer,
        updateAuthority: payer,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        recentBlockhashes: anchor.web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
        instructionSysvarAccount: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      remainingAccounts:
        remainingAccounts.length > 0 ? remainingAccounts : undefined,
    }),
  );

  try {
    return (
      await sendTransactions(
        candyMachine.program.provider.connection,
        candyMachine.program.provider.wallet,
        [instructions, cleanupInstructions],
        [signers, []],
      )
    ).txs.map(t => t.txid);
  } catch (e) {
    console.log(e);
  }

  return [];
};

export const shortenAddress = (address: string, chars = 4): string => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
