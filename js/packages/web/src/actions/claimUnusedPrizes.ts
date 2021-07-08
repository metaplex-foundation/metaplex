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
  deprecatedGetReservationList,
  MasterEditionV1,
  MasterEditionV2,
  findProgramAddress,
  programIds,
  createAssociatedTokenAccountInstruction,
  MetadataKey,
} from '@oyster/common';

import { AccountLayout } from '@solana/spl-token';
import { AuctionView, AuctionViewItem } from '../hooks';
import {
  WinningConfigType,
  redeemBid,
  redeemFullRightsTransferBid,
  WinningConfigStateItem,
  WinningConfigItem,
  withdrawMasterEdition,
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

  if (
    auctionView.participationItem &&
    auctionView.participationItem.masterEdition?.info.key ==
      MetadataKey.MasterEditionV2
  ) {
    await setupRedeemPrintingInstructions(
      connection,
      auctionView,
      wallet,
      auctionView.participationItem.safetyDeposit,
      auctionView.participationItem,
      signers,
      instructions,
    );
  }

  for (
    let winnerIndex = 0;
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
      const tokenBalance = await connection.getTokenAccountBalance(
        safetyDeposit.info.store,
      );
      // If box is empty, we cant redeem this. Could be broken AM we are claiming against.
      if (tokenBalance.value.uiAmount === 0) continue;
      // In principle it is possible to have two winning config items of same safety deposit box
      // so we cover for that possibility by doing an array not a find
      for (let j = 0; j < winningConfig.items.length; j++) {
        const winningConfigItem = winningConfig.items[j];
        if (
          winnerIndex < auctionView.auction.info.bidState.bids.length &&
          winningConfigItem.winningConfigType != WinningConfigType.PrintingV2
        ) {
          continue;
        }

        if (
          winningConfigItem.safetyDepositBoxIndex === safetyDeposit.info.order
        ) {
          const stateItem =
            auctionView.auctionManager.info.state.winningConfigStates[
              winnerIndex
            ].items[j];
          switch (winningConfigItem.winningConfigType) {
            case WinningConfigType.PrintingV1:
              console.log(
                'Redeeming printing v1 same way we redeem a normal bid because we arent printing it',
              );
              await deprecatedSetupRedeemPrintingInstructions(
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
            case WinningConfigType.PrintingV2:
              console.log('Redeeming printing v2');
              await setupRedeemPrintingInstructions(
                connection,
                auctionView,
                wallet,
                safetyDeposit,
                item,
                signers,
                instructions,
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
  connection: Connection,
  auctionView: AuctionView,
  wallet: any,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  item: AuctionViewItem,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
) {
  if (!item.masterEdition || !item.metadata) {
    return;
  }

  const myInstructions: TransactionInstruction[] = [];
  const mySigners: Keypair[] = [];
  const ata = (
    await findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        programIds().token.toBuffer(),
        item.metadata.info.mint.toBuffer(),
      ],
      programIds().associatedToken,
    )
  )[0];

  const existingAta = await connection.getAccountInfo(ata);
  console.log('Existing ata?', existingAta);
  if (!existingAta) {
    createAssociatedTokenAccountInstruction(
      myInstructions,
      ata,
      wallet.publicKey,
      wallet.publicKey,
      item.metadata.info.mint,
    );
  }

  await withdrawMasterEdition(
    auctionView.vault.pubkey,
    safetyDeposit.info.store,
    ata,
    safetyDeposit.pubkey,
    auctionView.vault.info.fractionMint,
    item.metadata.info.mint,
    myInstructions,
  );

  instructions.push(myInstructions);
  signers.push(mySigners);
}

async function deprecatedSetupRedeemPrintingInstructions(
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
  const me = item.masterEdition as ParsedAccount<MasterEditionV1>;
  const reservationList = await deprecatedGetReservationList(
    item.masterEdition.pubkey,
    auctionView.auctionManager.pubkey,
  );

  const newTokenAccount = accountsByMint.get(me.info.printingMint.toBase58());
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
          me.info.printingMint,
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
