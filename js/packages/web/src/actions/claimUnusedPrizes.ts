import {
  Keypair,
  Connection,
  TransactionInstruction,
  PublicKey,
} from '@solana/web3.js';
import {
  actions,
  ParsedAccount,
  TokenAccount,
  SafetyDepositBox,
  getReservationList,
} from '@oyster/common';

import { AccountLayout } from '@solana/spl-token';
import { AuctionView, AuctionViewItem } from '../hooks';
import {
  WinningConfigType,
  redeemBid,
  redeemFullRightsTransferBid,
  WinningConfigStateItem,
  WinningConfigItem,
} from '../models/metaplex';
const { createTokenAccount } = actions;

export async function claimUnusedPrizes(
  connection: Connection,
  wallet: any,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
) {
  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );

  for (
    let winnerIndex = auctionView.auction.info.bidState.bids.length;
    winnerIndex <
    auctionView.auctionManager.info.settings.winningConfigs.length;
    winnerIndex++
  ) {
    const winningConfig =
      auctionView.auctionManager.info.settings.winningConfigs[winnerIndex];
    const winningSet = auctionView.items[winnerIndex];

    for (let i = 0; i < winningSet.length; i++) {
      const item = winningSet[i];
      const safetyDeposit = item.safetyDeposit;
      // In principle it is possible to have two winning config items of same safety deposit box
      // so we cover for that possibility by doing an array not a find
      for (let j = 0; j < winningConfig.items.length; j++) {
        const winningConfigItem = winningConfig.items[j];

        if (
          winningConfigItem.safetyDepositBoxIndex === safetyDeposit.info.order
        ) {
          const stateItem =
            auctionView.auctionManager.info.state.winningConfigStates[
              winnerIndex
            ].items[j];
          switch (winningConfigItem.winningConfigType) {
            case WinningConfigType.Printing:
              console.log(
                'Redeeming printing same way we redeem a normal bid because we arent printing it',
              );
              await setupRedeemPrintingInstructions(
                auctionView,
                accountsByMint,
                accountRentExempt,
                wallet,
                safetyDeposit,
                item,
                signers,
                instructions,
                stateItem,
                winnerIndex,
              );
              break;
            case WinningConfigType.FullRightsTransfer:
              console.log('Redeeming Full Rights');
              await setupRedeemFullRightsTransferInstructions(
                auctionView,
                accountsByMint,
                accountRentExempt,
                wallet,
                safetyDeposit,
                item,
                signers,
                instructions,
                stateItem,
                winnerIndex,
              );
              break;
            case WinningConfigType.TokenOnlyTransfer:
              console.log('Redeeming Token only');
              await setupRedeemInstructions(
                auctionView,
                accountsByMint,
                accountRentExempt,
                wallet,
                safetyDeposit,
                signers,
                instructions,
                stateItem,
                winnerIndex,
              );
              break;
          }
        }
      }
    }
  }
}

async function setupRedeemInstructions(
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  accountRentExempt: number,
  wallet: any,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
  stateItem: WinningConfigStateItem,
  winningConfigIndex: number,
) {
  let winningPrizeSigner: Keypair[] = [];
  let winningPrizeInstructions: TransactionInstruction[] = [];

  signers.push(winningPrizeSigner);
  instructions.push(winningPrizeInstructions);
  if (!stateItem.claimed) {
    let newTokenAccount = accountsByMint.get(
      safetyDeposit.info.tokenMint.toBase58(),
    )?.pubkey;
    if (!newTokenAccount)
      newTokenAccount = createTokenAccount(
        winningPrizeInstructions,
        wallet.publicKey,
        accountRentExempt,
        safetyDeposit.info.tokenMint,
        wallet.publicKey,
        winningPrizeSigner,
      );

    await redeemBid(
      auctionView.auctionManager.info.vault,
      safetyDeposit.info.store,
      newTokenAccount,
      safetyDeposit.pubkey,
      auctionView.vault.info.fractionMint,
      wallet.publicKey,
      wallet.publicKey,
      undefined,
      undefined,
      false,
      winningPrizeInstructions,
      winningConfigIndex,
    );
  }
}

async function setupRedeemFullRightsTransferInstructions(
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  accountRentExempt: number,
  wallet: any,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  item: AuctionViewItem,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
  stateItem: WinningConfigStateItem,
  winningConfigIndex: number,
) {
  let winningPrizeSigner: Keypair[] = [];
  let winningPrizeInstructions: TransactionInstruction[] = [];

  signers.push(winningPrizeSigner);
  instructions.push(winningPrizeInstructions);
  if (!stateItem.claimed) {
    let newTokenAccount = accountsByMint.get(
      safetyDeposit.info.tokenMint.toBase58(),
    )?.pubkey;
    if (!newTokenAccount)
      newTokenAccount = createTokenAccount(
        winningPrizeInstructions,
        wallet.publicKey,
        accountRentExempt,
        safetyDeposit.info.tokenMint,
        wallet.publicKey,
        winningPrizeSigner,
      );

    await redeemFullRightsTransferBid(
      auctionView.auctionManager.info.vault,
      safetyDeposit.info.store,
      newTokenAccount,
      safetyDeposit.pubkey,
      auctionView.vault.info.fractionMint,
      wallet.publicKey,
      wallet.publicKey,
      winningPrizeInstructions,
      item.metadata.pubkey,
      wallet.publicKey,
      winningConfigIndex,
    );
  }
}

async function setupRedeemPrintingInstructions(
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  accountRentExempt: number,
  wallet: any,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  item: AuctionViewItem,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
  stateItem: WinningConfigStateItem,
  winningConfigIndex: number,
) {
  if (!item.masterEdition || !item.metadata) {
    return;
  }
  const updateAuth = item.metadata.info.updateAuthority;

  const reservationList = await getReservationList(
    item.masterEdition.pubkey,
    auctionView.auctionManager.pubkey,
  );

  const newTokenAccount = accountsByMint.get(
    item.masterEdition.info.printingMint.toBase58(),
  );
  let newTokenAccountKey: PublicKey | undefined = newTokenAccount?.pubkey;

  if (updateAuth) {
    console.log('This state item is', stateItem.claimed);
    if (!stateItem.claimed) {
      let winningPrizeSigner: Keypair[] = [];
      let winningPrizeInstructions: TransactionInstruction[] = [];

      signers.push(winningPrizeSigner);
      instructions.push(winningPrizeInstructions);
      if (!newTokenAccountKey)
        // TODO: switch to ATA
        newTokenAccountKey = createTokenAccount(
          winningPrizeInstructions,
          wallet.publicKey,
          accountRentExempt,
          item.masterEdition.info.printingMint,
          wallet.publicKey,
          winningPrizeSigner,
        );

      await redeemBid(
        auctionView.auctionManager.info.vault,
        safetyDeposit.info.store,
        newTokenAccountKey,
        safetyDeposit.pubkey,
        auctionView.vault.info.fractionMint,
        wallet.publicKey,
        wallet.publicKey,
        item.masterEdition.pubkey,
        reservationList,
        true,
        winningPrizeInstructions,
        winningConfigIndex,
      );
    }
  }
}
