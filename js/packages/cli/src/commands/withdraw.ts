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
  charityAddress: PublicKey,
  lamports: number,
  devPercent: number,
  charityPercent: number
): Promise<string> {
  const userKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadCandyProgram(userKeyPair, env);
  const signers = [userKeyPair];

    
  let instructions = [
    await anchorProgram.instruction.withdrawFunds({
      accounts: {
        config: configAddress,
        authority: userKeyPair.publicKey
      }
    )]
 if (parseFloat(charityPercent) > 0){

      log.info('Speaking of newfound wealth, this is where you donate % to charity :) the charity address and % are configurable.')

      const tBN = new anchor.BN(lamports);

      const lamportsToCharity =
            tBN
        .div(new anchor.BN(100))
        .mul(new anchor.BN(parseFloat(charityPercent)))

        .toNumber();

      console.log(`Sending ${lamportsToCharity} / ${t} lamports to charity`);

      instructions.puah(
        
        
        
          await anchor.web3.SystemProgram.transfer({
            fromPubkey: walletKeyPair.publicKey,
            toPubkey: new PublicKey(charityAddress),
            lamports: lamportsToCharity
          })
        )
        
      );

      log.info('send_to_charity finished', tx)
  return (
    await sendTransactionWithRetryWithKeypair(
      anchorProgram.provider.connection,
      userKeyPair,
      instructions,
      signers,
    )
  ).txid;
}

