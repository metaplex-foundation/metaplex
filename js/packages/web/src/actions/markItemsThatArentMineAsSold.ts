import {
  updatePrimarySaleHappenedViaToken,
  SafetyDepositDraft,
  WalletSigner,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { Keypair, TransactionInstruction } from '@solana/web3.js';

const SALE_TRANSACTION_SIZE = 10;

export async function markItemsThatArentMineAsSold(
  wallet: WalletSigner,
  safetyDepositDrafts: SafetyDepositDraft[],
): Promise<{ instructions: TransactionInstruction[][]; signers: Keypair[][] }> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const publicKey = wallet.publicKey.toBase58();

  const signers: Array<Keypair[]> = [];
  const instructions: Array<TransactionInstruction[]> = [];

  let markSigners: Keypair[] = [];
  let markInstructions: TransactionInstruction[] = [];

  // TODO replace all this with payer account so user doesnt need to click approve several times.

  for (let i = 0; i < safetyDepositDrafts.length; i++) {
    const item = safetyDepositDrafts[i].metadata;

    if (
      !item.info.data.creators?.find(c => c.address === publicKey) &&
      !item.info.primarySaleHappened
    ) {
      console.log(
        'For token',
        item.info.data.name,
        'marking it sold because i didnt make it but i want to keep proceeds',
      );
      await updatePrimarySaleHappenedViaToken(
        item.pubkey,
        publicKey,
        safetyDepositDrafts[i].holding,
        markInstructions,
      );

      if (markInstructions.length === SALE_TRANSACTION_SIZE) {
        signers.push(markSigners);
        instructions.push(markInstructions);
        markSigners = [];
        markInstructions = [];
      }
    }
  }

  if (
    markInstructions.length < SALE_TRANSACTION_SIZE &&
    markInstructions.length > 0
  ) {
    signers.push(markSigners);
    instructions.push(markInstructions);
  }

  return { instructions, signers };
}
