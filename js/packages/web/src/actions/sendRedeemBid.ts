import {
  Keypair,
  Connection,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  actions,
  ParsedAccount,
  programIds,
  models,
  TokenAccount,
  createMint,
  mintNewEditionFromMasterEditionViaToken,
  SafetyDepositBox,
  SequenceType,
  sendTransactions,
  cache,
  ensureWrappedAccount,
  sendTransactionWithRetry,
  updatePrimarySaleHappenedViaToken,
  getMetadata,
  getReservationList,
  AuctionState,
} from '@oyster/common';

import { AccountLayout, MintLayout, Token } from '@solana/spl-token';
import { AuctionView, AuctionViewItem } from '../hooks';
import {
  WinningConfigType,
  NonWinningConstraint,
  redeemBid,
  redeemFullRightsTransferBid,
  redeemParticipationBid,
  WinningConstraint,
  WinningConfigItem,
  WinningConfigStateItem,
} from '../models/metaplex';
import { claimBid } from '../models/metaplex/claimBid';
import { setupCancelBid } from './cancelBid';
import { populateParticipationPrintingAccount } from '../models/metaplex/populateParticipationPrintingAccount';
import { setupPlaceBid } from './sendPlaceBid';
const { createTokenAccount } = actions;
const { approve } = models;

export function eligibleForParticipationPrizeGivenWinningIndex(
  winnerIndex: number | null,
  auctionView: AuctionView,
) {
  return (
    (winnerIndex === null &&
      auctionView.auctionManager.info.settings.participationConfig
        ?.nonWinningConstraint !== NonWinningConstraint.NoParticipationPrize) ||
    (winnerIndex !== null &&
      auctionView.auctionManager.info.settings.participationConfig
        ?.winnerConstraint !== WinningConstraint.NoParticipationPrize)
  );
}

export async function sendRedeemBid(
  connection: Connection,
  wallet: any,
  payingAccount: PublicKey,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
) {
  let signers: Array<Keypair[]> = [];
  let instructions: Array<TransactionInstruction[]> = [];

  if (
    auctionView.auction.info.ended() &&
    auctionView.auction.info.state !== AuctionState.Ended
  ) {
    await setupPlaceBid(
      connection,
      wallet,
      payingAccount,
      auctionView,
      accountsByMint,
      0,
      instructions,
      signers,
    );
  }

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );

  const mintRentExempt = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );

  let winnerIndex = null;
  if (auctionView.myBidderPot?.pubkey)
    winnerIndex = auctionView.auction.info.bidState.getWinnerIndex(
      auctionView.myBidderPot?.info.bidderAct,
    );
  console.log('Winner index', winnerIndex);

  if (winnerIndex !== null) {
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
              console.log('Redeeming printing');
              await setupRedeemPrintingInstructions(
                auctionView,
                accountsByMint,
                accountRentExempt,
                mintRentExempt,
                wallet,
                safetyDeposit,
                item,
                signers,
                instructions,
                winningConfigItem,
                stateItem,
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
              );
              break;
          }
        }
      }
    }

    if (auctionView.myBidderMetadata && auctionView.myBidderPot) {
      let claimSigners: Keypair[] = [];
      let claimInstructions: TransactionInstruction[] = [];
      instructions.push(claimInstructions);
      signers.push(claimSigners);
      console.log('Claimed');
      await claimBid(
        auctionView.auctionManager.info.acceptPayment,
        auctionView.myBidderMetadata.info.bidderPubkey,
        auctionView.myBidderPot?.info.bidderPot,
        auctionView.vault.pubkey,
        auctionView.auction.info.tokenMint,
        claimInstructions,
      );
    }
  } else {
    // If you didnt win, you must have a bid we can refund before we check for open editions.
    await setupCancelBid(
      auctionView,
      accountsByMint,
      accountRentExempt,
      wallet,
      signers,
      instructions,
    );
  }

  if (
    auctionView.participationItem &&
    eligibleForParticipationPrizeGivenWinningIndex(winnerIndex, auctionView)
  ) {
    const item = auctionView.participationItem;
    const safetyDeposit = item.safetyDeposit;
    await setupRedeemParticipationInstructions(
      connection,
      auctionView,
      accountsByMint,
      accountRentExempt,
      mintRentExempt,
      wallet,
      safetyDeposit,
      item,
      signers,
      instructions,
    );
  }

  let stopPoint = 0;
  let tries = 0;
  let lastInstructionsLength = null;
  let toRemoveSigners: Record<number, boolean> = {};
  instructions = instructions.filter((instr, i) => {
    if (instr.length > 0) {
      return true;
    } else {
      toRemoveSigners[i] = true;
      return false;
    }
  });
  let filteredSigners = signers.filter((_, i) => !toRemoveSigners[i]);

  while (stopPoint < instructions.length && tries < 3) {
    instructions = instructions.slice(stopPoint, instructions.length);
    filteredSigners = filteredSigners.slice(stopPoint, filteredSigners.length);

    if (instructions.length === lastInstructionsLength) tries = tries + 1;
    else tries = 0;

    try {
      if (instructions.length === 1) {
        await sendTransactionWithRetry(
          connection,
          wallet,
          instructions[0],
          filteredSigners[0],
          'single',
        );
        stopPoint = 1;
      } else {
        stopPoint = await sendTransactions(
          connection,
          wallet,
          instructions,
          filteredSigners,
          SequenceType.StopOnFailure,
          'single',
        );
      }
    } catch (e) {
      console.error(e);
    }
    console.log(
      'Died on ',
      stopPoint,
      'retrying from instruction',
      instructions[stopPoint],
      'instructions length is',
      instructions.length,
    );
    lastInstructionsLength = instructions.length;
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
) {
  let winningPrizeSigner: Keypair[] = [];
  let winningPrizeInstructions: TransactionInstruction[] = [];

  signers.push(winningPrizeSigner);
  instructions.push(winningPrizeInstructions);
  if (!stateItem.claimed && auctionView.myBidderMetadata) {
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
      auctionView.myBidderMetadata.info.bidderPubkey,
      wallet.publicKey,
      undefined,
      undefined,
      false,
      winningPrizeInstructions,
    );

    const metadata = await getMetadata(safetyDeposit.info.tokenMint);
    await updatePrimarySaleHappenedViaToken(
      metadata,
      wallet.publicKey,
      newTokenAccount,
      winningPrizeInstructions,
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
) {
  let winningPrizeSigner: Keypair[] = [];
  let winningPrizeInstructions: TransactionInstruction[] = [];

  signers.push(winningPrizeSigner);
  instructions.push(winningPrizeInstructions);
  if (!stateItem.claimed && auctionView.myBidderMetadata) {
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
      auctionView.myBidderMetadata.info.bidderPubkey,
      wallet.publicKey,
      winningPrizeInstructions,
      item.metadata.pubkey,
      wallet.publicKey,
    );

    const metadata = await getMetadata(safetyDeposit.info.tokenMint);
    await updatePrimarySaleHappenedViaToken(
      metadata,
      wallet.publicKey,
      newTokenAccount,
      winningPrizeInstructions,
    );
  }
}

async function setupRedeemPrintingInstructions(
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  accountRentExempt: number,
  mintRentExempt: number,
  wallet: any,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  item: AuctionViewItem,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
  winningConfigItem: WinningConfigItem,
  stateItem: WinningConfigStateItem,
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

  let newTokenAccountBalance: number = newTokenAccount
    ? newTokenAccount.info.amount.toNumber()
    : 0;

  if (updateAuth && auctionView.myBidderMetadata) {
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
        auctionView.myBidderMetadata.info.bidderPubkey,
        wallet.publicKey,
        item.masterEdition.pubkey,
        reservationList,
        true,
        winningPrizeInstructions,
      );
      newTokenAccountBalance = winningConfigItem.amount;
    }

    if (newTokenAccountKey && newTokenAccountBalance > 0)
      for (let i = 0; i < newTokenAccountBalance; i++) {
        console.log('Redeeming token', i);
        await redeemPrintingToken(
          wallet,
          updateAuth,
          item,
          newTokenAccountKey,
          mintRentExempt,
          accountRentExempt,
          signers,
          instructions,
          reservationList,
        );
      }
  }
}

async function redeemPrintingToken(
  wallet: any,
  updateAuth: PublicKey,
  item: AuctionViewItem,
  newTokenAccount: PublicKey,
  mintRentExempt: number,
  accountRentExempt: number,
  signers: Keypair[][],
  instructions: TransactionInstruction[][],
  reservationList?: PublicKey,
) {
  if (!item.masterEdition) return;
  let cashInLimitedPrizeAuthorizationTokenSigner: Keypair[] = [];
  let cashInLimitedPrizeAuthorizationTokenInstruction: TransactionInstruction[] =
    [];
  signers.push(cashInLimitedPrizeAuthorizationTokenSigner);
  instructions.push(cashInLimitedPrizeAuthorizationTokenInstruction);

  const newLimitedEditionMint = createMint(
    cashInLimitedPrizeAuthorizationTokenInstruction,
    wallet.publicKey,
    mintRentExempt,
    0,
    wallet.publicKey,
    wallet.publicKey,
    cashInLimitedPrizeAuthorizationTokenSigner,
  );
  const newLimitedEdition = createTokenAccount(
    cashInLimitedPrizeAuthorizationTokenInstruction,
    wallet.publicKey,
    accountRentExempt,
    newLimitedEditionMint,
    wallet.publicKey,
    cashInLimitedPrizeAuthorizationTokenSigner,
  );

  cashInLimitedPrizeAuthorizationTokenInstruction.push(
    Token.createMintToInstruction(
      programIds().token,
      newLimitedEditionMint,
      newLimitedEdition,
      wallet.publicKey,
      [],
      1,
    ),
  );

  const burnAuthority = approve(
    cashInLimitedPrizeAuthorizationTokenInstruction,
    [],
    newTokenAccount,
    wallet.publicKey,
    1,
  );

  cashInLimitedPrizeAuthorizationTokenSigner.push(burnAuthority);

  await mintNewEditionFromMasterEditionViaToken(
    newLimitedEditionMint,
    item.metadata.info.mint,
    wallet.publicKey,
    item.masterEdition.info.printingMint,
    newTokenAccount,
    burnAuthority.publicKey,
    updateAuth,
    reservationList,
    cashInLimitedPrizeAuthorizationTokenInstruction,
    wallet.publicKey,
  );

  const metadata = await getMetadata(newLimitedEditionMint);
  await updatePrimarySaleHappenedViaToken(
    metadata,
    wallet.publicKey,
    newLimitedEdition,
    cashInLimitedPrizeAuthorizationTokenInstruction,
  );
}

async function setupRedeemParticipationInstructions(
  connection: Connection,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  accountRentExempt: number,
  mintRentExempt: number,
  wallet: any,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  item: AuctionViewItem,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
) {
  if (
    !auctionView.auctionManager.info.state.participationState
      ?.printingAuthorizationTokenAccount ||
    !item.masterEdition?.info.oneTimePrintingAuthorizationMint ||
    !item.metadata
  )
    return;

  const updateAuth = item.metadata.info.updateAuthority;
  let tokenAccount = accountsByMint.get(
    auctionView.auction.info.tokenMint.toBase58(),
  );
  const mint = cache.get(auctionView.auction.info.tokenMint);

  const participationBalance = await connection.getTokenAccountBalance(
    auctionView.auctionManager.info.state.participationState
      .printingAuthorizationTokenAccount,
  );
  const tokenBalance = await connection.getTokenAccountBalance(
    safetyDeposit.info.store,
  );

  if (
    participationBalance.value.uiAmount === 0 &&
    tokenBalance.value.uiAmount === 1
  ) {
    // I'm the first, I need to populate for the others with a crank turn.
    let fillParticipationStashSigners: Keypair[] = [];
    let fillParticipationStashInstructions: TransactionInstruction[] = [];
    const oneTimeTransient = createTokenAccount(
      fillParticipationStashInstructions,
      wallet.publicKey,
      accountRentExempt,
      item.masterEdition?.info.oneTimePrintingAuthorizationMint,
      auctionView.auctionManager.pubkey,
      fillParticipationStashSigners,
    );

    await populateParticipationPrintingAccount(
      auctionView.vault.pubkey,
      auctionView.auctionManager.pubkey,
      auctionView.auction.pubkey,
      safetyDeposit.info.store,
      oneTimeTransient,
      auctionView.auctionManager.info.state.participationState
        .printingAuthorizationTokenAccount,
      safetyDeposit.pubkey,
      auctionView.vault.info.fractionMint,
      item.masterEdition.info.printingMint,
      item.masterEdition.info.oneTimePrintingAuthorizationMint,
      item.masterEdition.pubkey,
      item.metadata.pubkey,
      wallet.publicKey,
      fillParticipationStashInstructions,
    );

    signers.push(fillParticipationStashSigners);
    instructions.push(fillParticipationStashInstructions);
  }

  let newTokenAccount: PublicKey | undefined = accountsByMint.get(
    item.masterEdition.info.printingMint.toBase58(),
  )?.pubkey;

  let newTokenBalance =
    accountsByMint.get(item.masterEdition.info.printingMint.toBase58())?.info
      .amount || 0;

  if (
    item.masterEdition &&
    updateAuth &&
    auctionView.myBidderMetadata &&
    mint &&
    !auctionView.myBidRedemption?.info.participationRedeemed
  ) {
    if (!auctionView.myBidRedemption?.info.participationRedeemed) {
      let winningPrizeSigner: Keypair[] = [];
      let winningPrizeInstructions: TransactionInstruction[] = [];
      let cleanupInstructions: TransactionInstruction[] = [];

      if (!newTokenAccount) {
        // made a separate txn because we're over the txn limit by like 10 bytes.
        let newTokenAccountSigner: Keypair[] = [];
        let newTokenAccountInstructions: TransactionInstruction[] = [];
        signers.push(newTokenAccountSigner);
        instructions.push(newTokenAccountInstructions);
        newTokenAccount = createTokenAccount(
          newTokenAccountInstructions,
          wallet.publicKey,
          accountRentExempt,
          item.masterEdition.info.printingMint,
          wallet.publicKey,
          newTokenAccountSigner,
        );
      }
      signers.push(winningPrizeSigner);

      let price: number = auctionView.auctionManager.info.settings
        .participationConfig?.fixedPrice
        ? auctionView.auctionManager.info.settings.participationConfig?.fixedPrice.toNumber()
        : auctionView.myBidderMetadata.info.lastBid.toNumber() || 0;

      const payingSolAccount = ensureWrappedAccount(
        winningPrizeInstructions,
        cleanupInstructions,
        tokenAccount,
        wallet.publicKey,
        price + accountRentExempt,
        winningPrizeSigner,
      );

      const transferAuthority = approve(
        winningPrizeInstructions,
        cleanupInstructions,
        payingSolAccount,
        wallet.publicKey,
        price,
      );

      winningPrizeSigner.push(transferAuthority);

      await redeemParticipationBid(
        auctionView.auctionManager.info.vault,
        safetyDeposit.info.store,
        newTokenAccount,
        safetyDeposit.pubkey,
        auctionView.vault.info.fractionMint,
        auctionView.myBidderMetadata.info.bidderPubkey,
        wallet.publicKey,
        winningPrizeInstructions,
        item.metadata.info.mint,
        auctionView.auctionManager.info.state.participationState
          .printingAuthorizationTokenAccount,
        transferAuthority.publicKey,
        auctionView.auctionManager.info.acceptPayment,
        payingSolAccount,
      );
      newTokenBalance = 1;
      instructions.push([...winningPrizeInstructions, ...cleanupInstructions]);
    }
  }

  if (newTokenAccount && newTokenBalance === 1) {
    await redeemPrintingToken(
      wallet,
      updateAuth,
      item,
      newTokenAccount,
      mintRentExempt,
      accountRentExempt,
      signers,
      instructions,
      undefined,
    );
  }
}
