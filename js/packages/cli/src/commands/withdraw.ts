import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import {
  getCandyMachineAddress,
  getMasterEdition,
  getMetadata,
  getTokenWallet,
  loadCandyProgram,
  loadWalletKey,
  uuidFromConfigPubkey,
  getConfig,
} from '../helpers/accounts';
import {
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  CANDY_MACHINE_PROGRAM_ID,
  CANDY_MACHINE,
} from '../helpers/constants';
import * as anchor from '@project-serum/anchor';
import { MintLayout, Token } from '@solana/spl-token';
import { createAssociatedTokenAccountInstruction } from '../helpers/instructions';
import { sendTransactionWithRetryWithKeypair } from '../helpers/transactions';

export async function withdraw(
  keypair: string,
  env: string,
  configAddress: PublicKey,
): Promise<string> {
  const userKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadCandyProgram(userKeyPair, env);

  const signers = [userKeyPair];

  const instructions = [
    await anchorProgram.instruction.withdrawFunds({
      accounts: {
        //candyMachine: candyMachineAddress,
        config: configAddress,
        authority: userKeyPair.publicKey,
      },
      remainingAccounts: [
        {
          //@ts-ignore
          pubkey: userKeyPair.publicKey,
          isWritable: true,
          isSigner: true,
        },
        {
          //@ts-ignore
          pubkey: configAddress,
          isWritable: true,
          isSigner: false,
        },
      ],
    }),
  ];
  return (
    await sendTransactionWithRetryWithKeypair(
      anchorProgram.provider.connection,
      userKeyPair,
      instructions,
      signers,
    )
  ).txid;
}
