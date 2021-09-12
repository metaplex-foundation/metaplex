import * as anchor from "@project-serum/anchor";

import {
  MintLayout,
  TOKEN_PROGRAM_ID,
  Token,
} from "@solana/spl-token";
import { AnchorProgram } from "./utils";

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

  console.log(state.treasury.toBase58());

  return {
    anchorProgram,
    ...state,
  } as FairLaunchState;
}
