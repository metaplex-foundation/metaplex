import { Keypair, Connection, TransactionInstruction } from '@solana/web3.js';
import {
  ParsedAccount,
  programIds,
  TokenAccount,
  createMint,
  SafetyDepositBox,
  cache,
  ensureWrappedAccount,
  updatePrimarySaleHappenedViaToken,
  getMetadata,
  deprecatedGetReservationList,
  AuctionState,
  sendTransactionsWithManualRetry,
  MasterEditionV1,
  MasterEditionV2,
  deprecatedMintNewEditionFromMasterEditionViaPrintingToken,
  MetadataKey,
  TokenAccountParser,
  BidderMetadata,
  getEditionMarkPda,
  decodeEditionMarker,
  StringPublicKey,
  toPublicKey,
  WalletSigner,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { AccountLayout, MintLayout, Token } from '@solana/spl-token';
import { AuctionView } from '../hooks';
import {
  AuctionManagerV1,
  ParticipationStateV1,
  WinningConfigType,
  NonWinningConstraint,
  redeemBid,
  redeemFullRightsTransferBid,
  deprecatedRedeemParticipationBid,
  redeemParticipationBidV3,
  WinningConstraint,
  redeemPrintingV2Bid,
  PrizeTrackingTicket,
  getPrizeTrackingTicket,
  BidRedemptionTicket,
  AuctionViewItem,
} from '@oyster/common/dist/lib/models/metaplex/index';
import { claimBid } from '@oyster/common/dist/lib/models/metaplex/claimBid';
import { approve } from '@oyster/common/dist/lib/models/account';
import { createTokenAccount } from '@oyster/common/dist/lib/actions/account';
import { setupCancelBid } from './cancelBid';
import { deprecatedPopulateParticipationPrintingAccount } from '@oyster/common/dist/lib/models/metaplex/deprecatedPopulateParticipationPrintingAccount';
import { setupPlaceBid } from './sendPlaceBid';
import { claimUnusedPrizes } from './claimUnusedPrizes';
import { createMintAndAccountWithOne } from './createMintAndAccountWithOne';
import { BN } from 'bn.js';
import { QUOTE_MINT } from '../constants';

export function eligibleForParticipationPrizeGivenWinningIndex(
  winnerIndex: number | null,
  auctionView: AuctionView,
  bidderMetadata: ParsedAccount<BidderMetadata> | undefined,
  bidRedemption: ParsedAccount<BidRedemptionTicket> | undefined,
) {
  const index =
    auctionView.auctionManager.participationConfig?.safetyDepositBoxIndex;
  if (index == undefined || index == null) {
    return false;
  }

  if (!bidderMetadata || bidRedemption?.info.getBidRedeemed(index))
    return false;

  return (
    (winnerIndex === null &&
      auctionView.auctionManager.participationConfig?.nonWinningConstraint !==
        NonWinningConstraint.NoParticipationPrize) ||
    (winnerIndex !== null &&
      auctionView.auctionManager.participationConfig?.winnerConstraint !==
        WinningConstraint.NoParticipationPrize)
  );
}

export async function sendRedeemBid(
  connection: Connection,
  wallet: WalletSigner,
  payingAccount: StringPublicKey,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  prizeTrackingTickets: Record<string, ParsedAccount<PrizeTrackingTicket>>,
  bidRedemptions: Record<string, ParsedAccount<BidRedemptionTicket>>,
  bids: ParsedAccount<BidderMetadata>[],
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const signers: Array<Keypair[]> = [];
  const instructions: Array<TransactionInstruction[]> = [];

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

  let winnerIndex: number | null = null;
  if (auctionView.myBidderPot?.pubkey)
    winnerIndex = auctionView.auction.info.bidState.getWinnerIndex(
      auctionView.myBidderPot?.info.bidderAct,
    );

  if (winnerIndex !== null) {
    // items is a prebuilt array of arrays where each entry represents one
    // winning spot, and each entry in it represents one type of item that can
    // be received.
    const winningSet = auctionView.items[winnerIndex];

    for (let i = 0; i < winningSet.length; i++) {
      const item = winningSet[i];
      const safetyDeposit = item.safetyDeposit;
      switch (item.winningConfigType) {
        case WinningConfigType.PrintingV1:
          console.log('Redeeming printing v1');
          await deprecatedSetupRedeemPrintingV1Instructions(
            auctionView,
            accountsByMint,
            accountRentExempt,
            mintRentExempt,
            wallet,
            safetyDeposit,
            item,
            winnerIndex,
            signers,
            instructions,
          );
          break;
        case WinningConfigType.PrintingV2:
          console.log('Redeeming printing v2');
          await setupRedeemPrintingV2Instructions(
            connection,
            auctionView,
            mintRentExempt,
            wallet,
            wallet.publicKey.toBase58(),
            safetyDeposit,
            item,
            signers,
            instructions,
            winnerIndex,
            prizeTrackingTickets,
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
            winnerIndex,
            signers,
            instructions,
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
            winnerIndex,
            signers,
            instructions,
          );
          break;
      }
    }

    if (auctionView.myBidderMetadata && auctionView.myBidderPot) {
      const claimSigners: Keypair[] = [];
      const claimInstructions: TransactionInstruction[] = [];
      instructions.push(claimInstructions);
      signers.push(claimSigners);
      console.log('Claimed');
      await claimBid(
        auctionView.auctionManager.acceptPayment,
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
    eligibleForParticipationPrizeGivenWinningIndex(
      winnerIndex,
      auctionView,
      auctionView.myBidderMetadata,
      auctionView.myBidRedemption,
    )
  ) {
    console.log('eligible for participation');
    const item = auctionView.participationItem;
    const safetyDeposit = item.safetyDeposit;
    if (item.masterEdition?.info.key == MetadataKey.MasterEditionV1) {
      await deprecatedSetupRedeemParticipationInstructions(
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
    } else {
      await setupRedeemParticipationInstructions(
        connection,
        auctionView,
        accountsByMint,
        accountRentExempt,
        mintRentExempt,
        wallet,
        wallet.publicKey.toBase58(),
        safetyDeposit,
        auctionView.myBidRedemption,
        auctionView.myBidderMetadata,
        item,
        signers,
        instructions,
      );
    }
  }

  if (wallet.publicKey.toBase58() === auctionView.auctionManager.authority) {
    await claimUnusedPrizes(
      connection,
      wallet,
      auctionView,
      accountsByMint,
      bids,
      bidRedemptions,
      prizeTrackingTickets,
      signers,
      instructions,
    );
  }

  await sendTransactionsWithManualRetry(
    connection,
    wallet,
    instructions,
    signers,
  );
}

async function setupRedeemInstructions(
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  accountRentExempt: number,
  wallet: WalletSigner,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  winnerIndex: number,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const winningPrizeSigner: Keypair[] = [];
  const winningPrizeInstructions: TransactionInstruction[] = [];

  signers.push(winningPrizeSigner);
  instructions.push(winningPrizeInstructions);
  const claimed = auctionView.auctionManager.isItemClaimed(
    winnerIndex,
    safetyDeposit.info.order,
  );
  if (!claimed && auctionView.myBidderMetadata) {
    let newTokenAccount = accountsByMint.get(
      safetyDeposit.info.tokenMint,
    )?.pubkey;
    if (!newTokenAccount)
      newTokenAccount = createTokenAccount(
        winningPrizeInstructions,
        wallet.publicKey,
        accountRentExempt,
        toPublicKey(safetyDeposit.info.tokenMint),
        wallet.publicKey,
        winningPrizeSigner,
      ).toBase58();

    await redeemBid(
      auctionView.auctionManager.vault,
      safetyDeposit.info.store,
      newTokenAccount,
      safetyDeposit.pubkey,
      auctionView.vault.info.fractionMint,
      auctionView.myBidderMetadata.info.bidderPubkey,
      wallet.publicKey.toBase58(),
      undefined,
      undefined,
      false,
      winningPrizeInstructions,
    );

    const metadata = await getMetadata(safetyDeposit.info.tokenMint);
    await updatePrimarySaleHappenedViaToken(
      metadata,
      wallet.publicKey.toBase58(),
      newTokenAccount,
      winningPrizeInstructions,
    );
  }
}

async function setupRedeemFullRightsTransferInstructions(
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  accountRentExempt: number,
  wallet: WalletSigner,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  item: AuctionViewItem,
  winnerIndex: number,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const winningPrizeSigner: Keypair[] = [];
  const winningPrizeInstructions: TransactionInstruction[] = [];

  signers.push(winningPrizeSigner);
  instructions.push(winningPrizeInstructions);

  const claimed = auctionView.auctionManager.isItemClaimed(
    winnerIndex,
    safetyDeposit.info.order,
  );
  if (!claimed && auctionView.myBidderMetadata) {
    let newTokenAccount = accountsByMint.get(
      safetyDeposit.info.tokenMint,
    )?.pubkey;
    if (!newTokenAccount)
      newTokenAccount = createTokenAccount(
        winningPrizeInstructions,
        wallet.publicKey,
        accountRentExempt,
        toPublicKey(safetyDeposit.info.tokenMint),
        wallet.publicKey,
        winningPrizeSigner,
      ).toBase58();

    await redeemFullRightsTransferBid(
      auctionView.auctionManager.vault,
      safetyDeposit.info.store,
      newTokenAccount,
      safetyDeposit.pubkey,
      auctionView.vault.info.fractionMint,
      auctionView.myBidderMetadata.info.bidderPubkey,
      wallet.publicKey.toBase58(),
      winningPrizeInstructions,
      item.metadata.pubkey,
      wallet.publicKey.toBase58(),
    );

    const metadata = await getMetadata(safetyDeposit.info.tokenMint);
    await updatePrimarySaleHappenedViaToken(
      metadata,
      wallet.publicKey.toBase58(),
      newTokenAccount,
      winningPrizeInstructions,
    );
  }
}

export async function setupRedeemPrintingV2Instructions(
  connection: Connection,
  auctionView: AuctionView,
  mintRentExempt: number,
  wallet: WalletSigner,
  receiverWallet: StringPublicKey,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  item: AuctionViewItem,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
  winningIndex: number,
  prizeTrackingTickets: Record<string, ParsedAccount<PrizeTrackingTicket>>,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  if (!item.masterEdition || !item.metadata) {
    return;
  }

  const me = item.masterEdition as ParsedAccount<MasterEditionV2>;

  const myPrizeTrackingTicketKey = await getPrizeTrackingTicket(
    auctionView.auctionManager.pubkey,
    item.metadata.info.mint,
  );

  const myPrizeTrackingTicket = prizeTrackingTickets[myPrizeTrackingTicketKey];
  // We are not entirely guaranteed this is right. Someone could be clicking at the same time. Contract will throw error if this
  // is the case and they'll need to refresh to get tracking ticket which may not have existed when they first clicked.
  const editionBase = myPrizeTrackingTicket
    ? myPrizeTrackingTicket.info.supplySnapshot
    : me.info.supply;
  let offset = new BN(1);

  auctionView.items.forEach(
    (wc, index) =>
      index < winningIndex &&
      wc.forEach(i => {
        if (
          i.safetyDeposit.info.order === item.safetyDeposit.info.order &&
          i.winningConfigType === item.winningConfigType
        ) {
          offset = offset.add(i.amount);
        }
      }),
  );

  for (let i = 0; i < item.amount.toNumber(); i++) {
    const myInstructions: TransactionInstruction[] = [];
    const mySigners: Keypair[] = [];

    const { mint, account } = await createMintAndAccountWithOne(
      wallet,
      receiverWallet,
      mintRentExempt,
      myInstructions,
      mySigners,
    );

    const winIndex =
      auctionView.auction.info.bidState.getWinnerIndex(receiverWallet) || 0;

    const desiredEdition = editionBase.add(offset.add(new BN(i)));
    const editionMarkPda = await getEditionMarkPda(
      item.metadata.info.mint,
      desiredEdition,
    );

    try {
      const editionData = await connection.getAccountInfo(
        toPublicKey(editionMarkPda),
      );

      if (editionData) {
        const marker = decodeEditionMarker(editionData.data);

        if (marker.editionTaken(desiredEdition.toNumber())) {
          console.log('Edition', desiredEdition, 'taken, continuing');
          continue;
        }
      }
    } catch (e) {
      console.error(e);
    }

    await redeemPrintingV2Bid(
      auctionView.vault.pubkey,
      safetyDeposit.info.store,
      account,
      safetyDeposit.pubkey,
      receiverWallet,
      wallet.publicKey.toBase58(),
      item.metadata.pubkey,
      me.pubkey,
      item.metadata.info.mint,
      mint,
      desiredEdition,
      new BN(offset.add(new BN(i))),
      new BN(winIndex),
      myInstructions,
    );

    const metadata = await getMetadata(mint);

    if (wallet.publicKey.toBase58() === receiverWallet) {
      await updatePrimarySaleHappenedViaToken(
        metadata,
        wallet.publicKey.toBase58(),
        account,
        myInstructions,
      );
    }
    instructions.push(myInstructions);
    signers.push(mySigners);
  }
}

async function deprecatedSetupRedeemPrintingV1Instructions(
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  accountRentExempt: number,
  mintRentExempt: number,
  wallet: WalletSigner,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  item: AuctionViewItem,
  winnerIndex: number,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  if (!item.masterEdition || !item.metadata) {
    return;
  }
  const updateAuth = item.metadata.info.updateAuthority;

  const reservationList = await deprecatedGetReservationList(
    item.masterEdition.pubkey,
    auctionView.auctionManager.pubkey,
  );

  const me = item.masterEdition as ParsedAccount<MasterEditionV1>;

  const newTokenAccount = accountsByMint.get(me.info.printingMint);
  let newTokenAccountKey: StringPublicKey | undefined = newTokenAccount?.pubkey;

  let newTokenAccountBalance: number = newTokenAccount
    ? newTokenAccount.info.amount.toNumber()
    : 0;

  const claimed = auctionView.auctionManager.isItemClaimed(
    winnerIndex,
    safetyDeposit.info.order,
  );

  if (updateAuth && auctionView.myBidderMetadata) {
    console.log('This state item is', claimed);
    if (!claimed) {
      const winningPrizeSigner: Keypair[] = [];
      const winningPrizeInstructions: TransactionInstruction[] = [];

      signers.push(winningPrizeSigner);
      instructions.push(winningPrizeInstructions);
      if (!newTokenAccountKey)
        // TODO: switch to ATA
        newTokenAccountKey = createTokenAccount(
          winningPrizeInstructions,
          wallet.publicKey,
          accountRentExempt,
          toPublicKey(me.info.printingMint),
          wallet.publicKey,
          winningPrizeSigner,
        ).toBase58();

      await redeemBid(
        auctionView.auctionManager.vault,
        safetyDeposit.info.store,
        newTokenAccountKey,
        safetyDeposit.pubkey,
        auctionView.vault.info.fractionMint,
        auctionView.myBidderMetadata.info.bidderPubkey,
        wallet.publicKey.toBase58(),
        item.masterEdition.pubkey,
        reservationList,
        true,
        winningPrizeInstructions,
      );
      newTokenAccountBalance = auctionView.auctionManager
        .getAmountForWinner(winnerIndex, safetyDeposit.info.order)
        .toNumber();
    }

    if (newTokenAccountKey && newTokenAccountBalance > 0)
      for (let i = 0; i < newTokenAccountBalance; i++) {
        console.log('Redeeming v1 token', i);
        await deprecatedRedeemPrintingV1Token(
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

async function deprecatedRedeemPrintingV1Token(
  wallet: WalletSigner,
  updateAuth: StringPublicKey,
  item: AuctionViewItem,
  newTokenAccount: StringPublicKey,
  mintRentExempt: number,
  accountRentExempt: number,
  signers: Keypair[][],
  instructions: TransactionInstruction[][],
  reservationList?: StringPublicKey,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  if (!item.masterEdition) return;
  const cashInLimitedPrizeAuthorizationTokenSigner: Keypair[] = [];
  const cashInLimitedPrizeAuthorizationTokenInstruction: TransactionInstruction[] =
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
  ).toBase58();
  const newLimitedEdition = createTokenAccount(
    cashInLimitedPrizeAuthorizationTokenInstruction,
    wallet.publicKey,
    accountRentExempt,
    toPublicKey(newLimitedEditionMint),
    wallet.publicKey,
    cashInLimitedPrizeAuthorizationTokenSigner,
  );

  cashInLimitedPrizeAuthorizationTokenInstruction.push(
    Token.createMintToInstruction(
      programIds().token,
      toPublicKey(newLimitedEditionMint),
      newLimitedEdition,
      wallet.publicKey,
      [],
      1,
    ),
  );

  const burnAuthority = approve(
    cashInLimitedPrizeAuthorizationTokenInstruction,
    [],
    toPublicKey(newTokenAccount),
    wallet.publicKey,
    1,
  );

  cashInLimitedPrizeAuthorizationTokenSigner.push(burnAuthority);

  const me = item.masterEdition as ParsedAccount<MasterEditionV1>;

  await deprecatedMintNewEditionFromMasterEditionViaPrintingToken(
    newLimitedEditionMint,
    item.metadata.info.mint,
    wallet.publicKey.toBase58(),
    me.info.printingMint,
    newTokenAccount,
    burnAuthority.publicKey.toBase58(),
    updateAuth,
    reservationList,
    cashInLimitedPrizeAuthorizationTokenInstruction,
    wallet.publicKey.toBase58(),
  );

  const metadata = await getMetadata(newLimitedEditionMint);
  await updatePrimarySaleHappenedViaToken(
    metadata,
    wallet.publicKey.toBase58(),
    newLimitedEdition.toBase58(),
    cashInLimitedPrizeAuthorizationTokenInstruction,
  );
}

export async function setupRedeemParticipationInstructions(
  connection: Connection,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  accountRentExempt: number,
  mintRentExempt: number,
  wallet: WalletSigner,
  receiverWallet: StringPublicKey,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  bidRedemption: ParsedAccount<BidRedemptionTicket> | undefined,
  bid: ParsedAccount<BidderMetadata> | undefined,
  item: AuctionViewItem,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  if (!item.masterEdition || !item.metadata) {
    return;
  }

  // Forgive me, for i have sinned. I had to split up the commands
  // here into multiple txns because participation redemption is huge.
  if (!bidRedemption?.info?.getBidRedeemed(safetyDeposit.info.order)) {
    const me = item.masterEdition as ParsedAccount<MasterEditionV2>;

    // Super unfortunate but cant fit this all in one txn
    const mintingInstructions: TransactionInstruction[] = [];
    const mintingSigners: Keypair[] = [];

    const cleanupInstructions: TransactionInstruction[] = [];

    const { mint, account } = await createMintAndAccountWithOne(
      wallet,
      receiverWallet,
      mintRentExempt,
      mintingInstructions,
      mintingSigners,
    );

    const fixedPrice =
      auctionView.auctionManager.participationConfig?.fixedPrice;
    const price: number =
      fixedPrice !== undefined && fixedPrice !== null
        ? fixedPrice.toNumber()
        : bid?.info.lastBid.toNumber() || 0;

    let tokenAccount = accountsByMint.get(auctionView.auction.info.tokenMint);

    console.log('Have token account', tokenAccount);
    if (!tokenAccount) {
      // In case accountsByMint missed it(which it does sometimes)
      const allAccounts = await connection.getTokenAccountsByOwner(
        wallet.publicKey,
        { mint: QUOTE_MINT },
      );

      if (allAccounts.value.length > 0) {
        tokenAccount = TokenAccountParser(
          allAccounts.value[0].pubkey.toBase58(),
          allAccounts.value[0].account,
        );
      }
      console.log('Found token account', tokenAccount);
    }

    const payingSolAccount = ensureWrappedAccount(
      mintingInstructions,
      cleanupInstructions,
      tokenAccount,
      wallet.publicKey,
      price + accountRentExempt,
      mintingSigners,
    );

    instructions.push(mintingInstructions);
    signers.push(mintingSigners);

    const myInstructions: TransactionInstruction[] = [];

    const mySigners: Keypair[] = [];

    const transferAuthority = approve(
      myInstructions,
      cleanupInstructions,
      toPublicKey(payingSolAccount),
      wallet.publicKey,
      price,
    );

    mySigners.push(transferAuthority);
    const winnerIndex = auctionView.auction.info.bidState.getWinnerIndex(
      wallet.publicKey.toBase58(),
    );
    await redeemParticipationBidV3(
      auctionView.vault.pubkey,
      safetyDeposit.info.store,
      account,
      safetyDeposit.pubkey,
      receiverWallet,
      wallet.publicKey.toBase58(),
      item.metadata.pubkey,
      me.pubkey,
      item.metadata.info.mint,
      transferAuthority.publicKey.toBase58(),
      auctionView.auctionManager.acceptPayment,
      payingSolAccount,
      mint,
      me.info.supply.add(new BN(1)),
      winnerIndex != null && winnerIndex != undefined
        ? new BN(winnerIndex)
        : null,
      myInstructions,
    );
    instructions.push([...myInstructions, ...cleanupInstructions]);
    signers.push(mySigners);
    const metadata = await getMetadata(mint);

    if (receiverWallet === wallet.publicKey.toBase58()) {
      const updatePrimarySaleHappenedInstructions: TransactionInstruction[] =
        [];
      const updatePrimarySaleHappenedSigners: Keypair[] = [];

      await updatePrimarySaleHappenedViaToken(
        metadata,
        wallet.publicKey.toBase58(),
        account,
        updatePrimarySaleHappenedInstructions,
      );
      instructions.push(updatePrimarySaleHappenedInstructions);
      signers.push(updatePrimarySaleHappenedSigners);
    }
  } else {
    console.log('Item is already claimed!', item.metadata.info.mint);
  }
}

async function deprecatedSetupRedeemParticipationInstructions(
  connection: Connection,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  accountRentExempt: number,
  mintRentExempt: number,
  wallet: WalletSigner,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  item: AuctionViewItem,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const me = item.masterEdition as ParsedAccount<MasterEditionV1>;
  const participationState: ParticipationStateV1 | null = (
    auctionView.auctionManager.instance.info as AuctionManagerV1
  ).state?.participationState;
  if (
    !participationState ||
    !participationState?.printingAuthorizationTokenAccount ||
    !me?.info.oneTimePrintingAuthorizationMint ||
    !item.metadata
  )
    return;

  const updateAuth = item.metadata.info.updateAuthority;
  const tokenAccount = accountsByMint.get(auctionView.auction.info.tokenMint);
  const mint = cache.get(auctionView.auction.info.tokenMint);

  const participationBalance = await connection.getTokenAccountBalance(
    toPublicKey(participationState.printingAuthorizationTokenAccount),
  );
  const tokenBalance = await connection.getTokenAccountBalance(
    toPublicKey(safetyDeposit.info.store),
  );

  if (
    participationBalance.value.uiAmount === 0 &&
    tokenBalance.value.uiAmount === 1
  ) {
    // I'm the first, I need to populate for the others with a crank turn.
    const fillParticipationStashSigners: Keypair[] = [];
    const fillParticipationStashInstructions: TransactionInstruction[] = [];
    const oneTimeTransient = createTokenAccount(
      fillParticipationStashInstructions,
      wallet.publicKey,
      accountRentExempt,
      toPublicKey(me?.info.oneTimePrintingAuthorizationMint),
      toPublicKey(auctionView.auctionManager.pubkey),
      fillParticipationStashSigners,
    ).toBase58();

    await deprecatedPopulateParticipationPrintingAccount(
      auctionView.vault.pubkey,
      auctionView.auctionManager.pubkey,
      auctionView.auction.pubkey,
      safetyDeposit.info.store,
      oneTimeTransient,
      participationState.printingAuthorizationTokenAccount,
      safetyDeposit.pubkey,
      auctionView.vault.info.fractionMint,
      me.info.printingMint,
      me.info.oneTimePrintingAuthorizationMint,
      me.pubkey,
      item.metadata.pubkey,
      wallet.publicKey.toBase58(),
      fillParticipationStashInstructions,
    );

    signers.push(fillParticipationStashSigners);
    instructions.push(fillParticipationStashInstructions);
  }

  let newTokenAccount: StringPublicKey | undefined = accountsByMint.get(
    me.info.printingMint,
  )?.pubkey;

  let newTokenBalance =
    accountsByMint.get(me.info.printingMint)?.info.amount || 0;

  if (
    me &&
    updateAuth &&
    auctionView.myBidderMetadata &&
    mint &&
    !auctionView.myBidRedemption?.info.getBidRedeemed(safetyDeposit.info.order)
  ) {
    if (
      !auctionView.myBidRedemption?.info.getBidRedeemed(
        safetyDeposit.info.order,
      )
    ) {
      const winningPrizeSigner: Keypair[] = [];
      const winningPrizeInstructions: TransactionInstruction[] = [];
      const cleanupInstructions: TransactionInstruction[] = [];

      if (!newTokenAccount) {
        // made a separate txn because we're over the txn limit by like 10 bytes.
        const newTokenAccountSigner: Keypair[] = [];
        const newTokenAccountInstructions: TransactionInstruction[] = [];
        signers.push(newTokenAccountSigner);
        instructions.push(newTokenAccountInstructions);
        newTokenAccount = createTokenAccount(
          newTokenAccountInstructions,
          wallet.publicKey,
          accountRentExempt,
          toPublicKey(me.info.printingMint),
          wallet.publicKey,
          newTokenAccountSigner,
        ).toBase58();
      }
      signers.push(winningPrizeSigner);

      const fixedPrice =
        auctionView.auctionManager.participationConfig?.fixedPrice;
      const price: number =
        fixedPrice !== undefined && fixedPrice !== null
          ? fixedPrice.toNumber()
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
        toPublicKey(payingSolAccount),
        wallet.publicKey,
        price,
      );

      winningPrizeSigner.push(transferAuthority);

      await deprecatedRedeemParticipationBid(
        auctionView.auctionManager.vault,
        safetyDeposit.info.store,
        newTokenAccount,
        safetyDeposit.pubkey,
        auctionView.myBidderMetadata.info.bidderPubkey,
        wallet.publicKey.toBase58(),
        winningPrizeInstructions,
        participationState.printingAuthorizationTokenAccount,
        transferAuthority.publicKey.toBase58(),
        auctionView.auctionManager.acceptPayment,
        payingSolAccount,
      );
      newTokenBalance = 1;
      instructions.push([...winningPrizeInstructions, ...cleanupInstructions]);
    }
  }

  if (newTokenAccount && newTokenBalance === 1) {
    await deprecatedRedeemPrintingV1Token(
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
