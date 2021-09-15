import * as anchor from "@project-serum/anchor";

import {
  MintLayout,
  TOKEN_PROGRAM_ID,
  Token,
} from "@solana/spl-token";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProgram, createAssociatedTokenAccountInstruction, getAtaForMint } from "./utils";

export const FAIR_LAUNCH_PROGRAM = new anchor.web3.PublicKey(
  "7HmfyvWK7LDohUL9TDAuGv9VFZHUce1SgYMkwti1xWwF"
);


export interface FairLaunchState {
  anchorProgram: AnchorProgram;

  authority: anchor.web3.PublicKey;
  bump: number;

  currentMedian: anchor.BN;
  data: {
    antiRugSetting: null
    fee: anchor.BN;
    numberOfTokens: anchor.BN;
    phaseOneEnd: anchor.BN;
    phaseOneStart: anchor.BN;
    phaseTwoEnd: anchor.BN;
    priceRangeEnd: anchor.BN;
    priceRangeStart: anchor.BN;
    tickSize: anchor.BN;
    uuid: string;
  };
  numberTicketsDropped: anchor.BN;
  numberTicketsPunched: anchor.BN;
  numberTicketsSold: anchor.BN;
  numberTicketsUnSeqed: anchor.BN;
  numberTokensBurnedForRefunds: anchor.BN;
  numberTokensPreminted: anchor.BN;
  phaseThreeStarted: false
  tokenMint: anchor.web3.PublicKey;
  tokenMintBump: number;
  treasury: anchor.web3.PublicKey;
  treasuryBump: number;
  treasuryMint: null; // only for SPL tokens
  treasurySnapshot: null;
}

export const getFairLaunchState = async (
  anchorWallet: anchor.Wallet,
  fairLaunchId: anchor.web3.PublicKey,
  connection: anchor.web3.Connection,
): Promise<FairLaunchState> => {
  const provider = new anchor.Provider(connection, anchorWallet, {
    preflightCommitment: "recent",
  });

  const idl = await anchor.Program.fetchIdl(
    FAIR_LAUNCH_PROGRAM,
    provider
  );

  const program = new anchor.Program(idl, FAIR_LAUNCH_PROGRAM, provider);
  const anchorProgram = {
    id: fairLaunchId,
    connection,
    program,
  }

  const state: any = await program.account.fairLaunch.fetch(fairLaunchId);

  console.log(state?.treasury.toBase58());
  const accountInfo = await connection.getAccountInfo(state?.treasury);
  console.log(accountInfo);

  return {
    anchorProgram,
    ...state,
  } as FairLaunchState;
}

const punchTicker = async (
  anchorWallet: anchor.Wallet,
  fairLaunchId: anchor.web3.PublicKey,
  connection: anchor.web3.Connection,
  fairLaunch: FairLaunchState) => {
  const fairLaunchTicket = (
    await getFairLaunchTicket(
      //@ts-ignore
      fairLaunchObj.tokenMint,
      anchorWallet.publicKey,
    )
  )[0];

  const fairLaunchLotteryBitmap = ( //@ts-ignore
    await getFairLaunchLotteryBitmap(fairLaunchObj.tokenMint)
  )[0];

  const buyerTokenAccount = (
    await getAtaForMint(
      //@ts-ignore
      fairLaunchObj.tokenMint,
      anchorWallet.publicKey,
    )
  )[0];

  await fairLaunch.anchorProgram.program.rpc.punchTicket({
    accounts: {
      fairLaunchTicket,
      fairLaunch: fairLaunchId,
      fairLaunchLotteryBitmap,
      payer: anchorWallet.publicKey,
      buyerTokenAccount,
      //@ts-ignore
      tokenMint: fairLaunchObj.tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
    instructions: [
      createAssociatedTokenAccountInstruction(
        buyerTokenAccount,
        anchorWallet.publicKey,
        anchorWallet.publicKey,
        //@ts-ignore
        fairLaunchObj.tokenMint,
      ),
    ],
  });
}

export const getFairLaunchTicket = async (
  tokenMint: anchor.web3.PublicKey,
  buyer: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('fair_launch'), tokenMint.toBuffer(), buyer.toBuffer()],
    FAIR_LAUNCH_PROGRAM,
  );
};

export const purchaseTicket = async (
  amount: number,
  anchorWallet: anchor.Wallet,
  fairLaunch: FairLaunchState | undefined) => {

  if (!fairLaunch) {
    return;
  }

  const [fairLaunchTicket, bump] = await getFairLaunchTicket(
    //@ts-ignore
    fairLaunch.tokenMint,
    anchorWallet.publicKey,
  );

  const remainingAccounts = [];
  const instructions = [];
  const signers = [];

  let amountLamports = 0;
  //@ts-ignore
  if (!fairLaunch.treasuryMint) {
    amountLamports = Math.ceil(amount * LAMPORTS_PER_SOL);
  } else {
    const transferAuthority = anchor.web3.Keypair.generate();
    signers.push(transferAuthority);

    instructions.push(
      Token.createApproveInstruction(
        TOKEN_PROGRAM_ID,
        //@ts-ignore
        fairLaunch.treasuryMint,
        transferAuthority.publicKey,
        anchorWallet.publicKey,
        [],
        //@ts-ignore
        amountNumber + fairLaunch.data.fees.toNumber(),
      ),
    );

    remainingAccounts.push({
      //@ts-ignore
      pubkey: fairLaunch.treasuryMint,
      isWritable: true,
      isSigner: false,
    });
    remainingAccounts.push({
      pubkey: (
        await getAtaForMint(
          //@ts-ignore
          fairLaunch.treasuryMint,
          anchorWallet.publicKey,
        )
      )[0],
      isWritable: true,
      isSigner: false,
    });
    remainingAccounts.push({
      pubkey: transferAuthority.publicKey,
      isWritable: false,
      isSigner: true,
    });
    remainingAccounts.push({
      pubkey: TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    });
  }

  await fairLaunch.anchorProgram.program.rpc.purchaseTicket(
    bump,
    new anchor.BN(amountLamports),
    {
      accounts: {
        fairLaunchTicket,
        fairLaunch: fairLaunch.anchorProgram.id,
        //@ts-ignore
        treasury: fairLaunch.treasury,
        buyer: anchorWallet.publicKey,
        payer: anchorWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      //__private: { logAccounts: true },
      remainingAccounts,
      signers,
      instructions: instructions.length > 0 ? instructions : undefined,
    });
}

export const withdrawFunds = async (
  amount: number,
  anchorWallet: anchor.Wallet,
  fairLaunch: FairLaunchState | undefined) => {

  if (!fairLaunch) {
    return;
  }
  debugger;

  // TODO: create sequence ticket

    const remainingAccounts = [];

    //@ts-ignore
    if (fairLaunch.treasuryMint) {
      remainingAccounts.push({
        //@ts-ignore
        pubkey: fairLaunch.treasuryMint,
        isWritable: true,
        isSigner: false,
      });
      remainingAccounts.push({
        pubkey: (
          await getAtaForMint(
            //@ts-ignore
            fairLaunch.treasuryMint,
            anchorWallet.publicKey,
          )
        )[0],
        isWritable: true,
        isSigner: false,
      });
      remainingAccounts.push({
        pubkey: TOKEN_PROGRAM_ID,
        isWritable: false,
        isSigner: false,
      });
    }

    await fairLaunch.anchorProgram.program.rpc.withdrawFunds({
      accounts: {
        fairLaunch,
        // @ts-ignore
        treasury: fairLaunch.treasury,
        authority: anchorWallet.publicKey,
        // @ts-ignore
        tokenMint: fairLaunch.tokenMint,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      remainingAccounts,
    });
}
