import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import {
  CANDY_MACHINE,
  CANDY_MACHINE_PROGRAM_ID,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  FAIR_LAUNCH_PROGRAM_ID,
} from './constants';
import * as anchor from '@project-serum/anchor';
import fs from 'fs';
import BN from 'bn.js';
import { createConfigAccount } from './instructions';
import { web3 } from '@project-serum/anchor';
import log from 'loglevel';

export const createConfig = async function (
  anchorProgram: anchor.Program,
  payerWallet: Keypair,
  configData: {
    maxNumberOfLines: BN;
    symbol: string;
    sellerFeeBasisPoints: number;
    isMutable: boolean;
    maxSupply: BN;
    retainAuthority: boolean;
    creators: {
      address: PublicKey;
      verified: boolean;
      share: number;
    }[];
  },
) {
  const configAccount = Keypair.generate();
  const uuid = uuidFromConfigPubkey(configAccount.publicKey);

  return {
    config: configAccount.publicKey,
    uuid,
    txId: await anchorProgram.rpc.initializeConfig(
      {
        uuid,
        ...configData,
      },
      {
        accounts: {
          config: configAccount.publicKey,
          authority: payerWallet.publicKey,
          payer: payerWallet.publicKey,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [payerWallet, configAccount],
        instructions: [
          await createConfigAccount(
            anchorProgram,
            configData,
            payerWallet.publicKey,
            configAccount.publicKey,
          ),
        ],
      },
    ),
  };
};

export function uuidFromConfigPubkey(configAccount: PublicKey) {
  return configAccount.toBase58().slice(0, 6);
}

export const getTokenWallet = async function (
  wallet: PublicKey,
  mint: PublicKey,
) {
  return (
    await PublicKey.findProgramAddress(
      [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    )
  )[0];
};

export const getCandyMachineAddress = async (
  config: anchor.web3.PublicKey,
  uuid: string,
): Promise<[PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(CANDY_MACHINE), config.toBuffer(), Buffer.from(uuid)],
    CANDY_MACHINE_PROGRAM_ID,
  );
};

export const getConfig = async (
  authority: anchor.web3.PublicKey,
  uuid: string,
): Promise<[PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(CANDY_MACHINE), authority.toBuffer(), Buffer.from(uuid)],
    CANDY_MACHINE_PROGRAM_ID,
  );
};

export const getTokenMint = async (
  authority: anchor.web3.PublicKey,
  uuid: string,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('fair_launch'),
      authority.toBuffer(),
      Buffer.from('mint'),
      Buffer.from(uuid),
    ],
    FAIR_LAUNCH_PROGRAM_ID,
  );
};

export const getFairLaunch = async (
  tokenMint: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('fair_launch'), tokenMint.toBuffer()],
    FAIR_LAUNCH_PROGRAM_ID,
  );
};

export const getFairLaunchTicket = async (
  tokenMint: anchor.web3.PublicKey,
  buyer: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('fair_launch'), tokenMint.toBuffer(), buyer.toBuffer()],
    FAIR_LAUNCH_PROGRAM_ID,
  );
};

export const getFairLaunchLotteryBitmap = async (
  tokenMint: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('fair_launch'), tokenMint.toBuffer(), Buffer.from('lottery')],
    FAIR_LAUNCH_PROGRAM_ID,
  );
};

export const getFairLaunchTicketSeqLookup = async (
  tokenMint: anchor.web3.PublicKey,
  seq: anchor.BN,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('fair_launch'), tokenMint.toBuffer(), seq.toBuffer('le', 8)],
    FAIR_LAUNCH_PROGRAM_ID,
  );
};

export const getAtaForMint = async (
  mint: anchor.web3.PublicKey,
  buyer: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [buyer.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  );
};

export const getParticipationMint = async (
  authority: anchor.web3.PublicKey,
  uuid: string,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('fair_launch'),
      authority.toBuffer(),
      Buffer.from('mint'),
      Buffer.from(uuid),
      Buffer.from('participation'),
    ],
    FAIR_LAUNCH_PROGRAM_ID,
  );
};

export const getParticipationToken = async (
  authority: anchor.web3.PublicKey,
  uuid: string,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('fair_launch'),
      authority.toBuffer(),
      Buffer.from('mint'),
      Buffer.from(uuid),
      Buffer.from('participation'),
      Buffer.from('account'),
    ],
    FAIR_LAUNCH_PROGRAM_ID,
  );
};

export const getTreasury = async (
  tokenMint: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('fair_launch'), tokenMint.toBuffer(), Buffer.from('treasury')],
    FAIR_LAUNCH_PROGRAM_ID,
  );
};

export const getMetadata = async (
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

export const getMasterEdition = async (
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

export const getEditionMarkPda = async (
  mint: anchor.web3.PublicKey,
  edition: number,
): Promise<anchor.web3.PublicKey> => {
  const editionNumber = Math.floor(edition / 248);
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from('edition'),
        Buffer.from(editionNumber.toString()),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

export function loadWalletKey(keypair): Keypair {
  if (!keypair || keypair == '') {
    throw new Error('Keypair is required!');
  }
  const loaded = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(keypair).toString())),
  );
  log.info(`wallet public key: ${loaded.publicKey}`);
  return loaded;
}

export async function loadCandyProgram(walletKeyPair: Keypair, env: string) {
  // @ts-ignore
  const solConnection = new web3.Connection(web3.clusterApiUrl(env));
  const walletWrapper = new anchor.Wallet(walletKeyPair);
  const provider = new anchor.Provider(solConnection, walletWrapper, {
    preflightCommitment: 'recent',
  });
  const idl = await anchor.Program.fetchIdl(CANDY_MACHINE_PROGRAM_ID, provider);

  const program = new anchor.Program(idl, CANDY_MACHINE_PROGRAM_ID, provider);
  log.debug('program id from anchor', program.programId.toBase58());
  return program;
}

export async function loadFairLaunchProgram(
  walletKeyPair: Keypair,
  env: string,
) {
  // @ts-ignore
  const solConnection = new anchor.web3.Connection(web3.clusterApiUrl(env));
  const walletWrapper = new anchor.Wallet(walletKeyPair);
  const provider = new anchor.Provider(solConnection, walletWrapper, {
    preflightCommitment: 'recent',
  });
  const idl = await anchor.Program.fetchIdl(FAIR_LAUNCH_PROGRAM_ID, provider);

  return new anchor.Program(idl, FAIR_LAUNCH_PROGRAM_ID, provider);
}
