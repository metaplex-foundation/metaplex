import { Keypair, Connection, TransactionInstruction } from '@solana/web3.js';
import {
  actions,
  ParsedAccount,
  TokenAccount,
  SafetyDepositBox,
  deprecatedGetReservationList,
  MasterEditionV1,
  findProgramAddress,
  programIds,
  createAssociatedTokenAccountInstruction,
  MetadataKey,
  BidderMetadata,
  toPublicKey,
  WalletSigner,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { AccountLayout, MintLayout } from '@solana/spl-token';
import { AuctionView, AuctionViewItem } from '../hooks';
import {
  WinningConfigType,
  redeemBid,
  redeemFullRightsTransferBid,
  withdrawMasterEdition,
  BidRedemptionTicket,
  getBidRedemption,
  PrizeTrackingTicket,
} from '../models/metaplex';
import {
  eligibleForParticipationPrizeGivenWinningIndex,
  setupRedeemParticipationInstructions,
  setupRedeemPrintingV2Instructions,
} from './sendRedeemBid';
const { createTokenAccount } = actions;

export async function findEligibleParticipationBidsForRedemption(
  auctionView: AuctionView,
  bids: ParsedAccount<BidderMetadata>[],
  bidRedemptions: Record<string, ParsedAccount<BidRedemptionTicket>>,
): Promise<
  {
    bid: ParsedAccount<BidderMetadata>;
    bidRedemption: ParsedAccount<BidRedemptionTicket>;
  }[]
> {
  const unredeemedParticipations: {
    bid: ParsedAccount<BidderMetadata>;
    bidRedemption: ParsedAccount<BidRedemptionTicket>;
  }[] = [];
  for (let i = 0; i < bids.length; i++) {
    const bid = bids[i];
    if (!bid.info.cancelled) {
      const winnerIndex = auctionView.auction.info.bidState.getWinnerIndex(
        bid.info.bidderPubkey,
      );
      const bidRedemption =
        bidRedemptions[
          await getBidRedemption(auctionView.auction.pubkey, bid.pubkey)
        ];
      const eligible = eligibleForParticipationPrizeGivenWinningIndex(
        winnerIndex,
        auctionView,
        bid,
        bidRedemption,
      );
      console.log(bid.pubkey, 'eligible?', eligible);
      if (eligible) {
        unredeemedParticipations.push({ bid, bidRedemption });
      }
    }
  }
  return unredeemedParticipations;
}

export async function claimUnusedPrizes(
  connection: Connection,
  wallet: WalletSigner,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  bids: ParsedAccount<BidderMetadata>[],
  bidRedemptions: Record<string, ParsedAccount<BidRedemptionTicket>>,
  prizeTrackingTickets: Record<string, ParsedAccount<PrizeTrackingTicket>>,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
) {
  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );
  const mintRentExempt = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );

  if (
    auctionView.participationItem &&
    auctionView.participationItem.safetyDeposit &&
    auctionView.participationItem.masterEdition?.info.key ==
      MetadataKey.MasterEditionV2
  ) {
    const balance = await connection.getTokenAccountBalance(
      toPublicKey(auctionView.participationItem.safetyDeposit.info.store),
    );
    if (balance.value.uiAmount || 0 > 0) {
      // before we can redeem, check if we need to print other people's stuff.

      const unredeemedParticipations =
        await findEligibleParticipationBidsForRedemption(
          auctionView,
          bids,
          bidRedemptions,
        );

      await Promise.all(
        unredeemedParticipations.map(
          p =>
            auctionView.participationItem &&
            setupRedeemParticipationInstructions(
              connection,
              auctionView,
              accountsByMint,
              accountRentExempt,
              mintRentExempt,
              wallet,
              p.bid.info.bidderPubkey,
              auctionView.participationItem.safetyDeposit,
              p.bidRedemption,
              p.bid,
              auctionView.participationItem,
              signers,
              instructions,
            ),
        ),
      );

      await setupWithdrawMasterEditionInstructions(
        connection,
        auctionView,
        wallet,
        auctionView.participationItem.safetyDeposit,
        auctionView.participationItem,
        signers,
        instructions,
      );
    }
  }

  const printingV2ByMint: Record<string, AuctionViewItem> = {};

  for (
    let winnerIndex = 0;
    winnerIndex < auctionView.auctionManager.numWinners.toNumber();
    winnerIndex++
  ) {
    const winningSet = auctionView.items[winnerIndex];

    for (let i = 0; i < winningSet.length; i++) {
      const item = winningSet[i];

      const safetyDeposit = item.safetyDeposit;
      const tokenBalance = await connection.getTokenAccountBalance(
        toPublicKey(safetyDeposit.info.store),
      );
      // If box is empty, we cant redeem this. Could be broken AM we are claiming against.
      if (tokenBalance.value.uiAmount === 0) {
        console.log('Skipping', i, ' due to empty balance');
        continue;
      }
      if (
        winnerIndex < auctionView.auction.info.bidState.bids.length &&
        item.winningConfigType != WinningConfigType.PrintingV2
      ) {
        continue;
      }

      switch (item.winningConfigType) {
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
            winnerIndex,
          );
          break;
        case WinningConfigType.PrintingV2: {
          const winningBidder =
            auctionView.auction.info.bidState.getWinnerAt(winnerIndex);
          if (winningBidder) {
            const bidderMetadata = bids.find(
              b => b.info.bidderPubkey === winningBidder,
            );
            if (bidderMetadata) {
              console.log('Redeeming v2 for bid by wallet', winningBidder);
              await setupRedeemPrintingV2Instructions(
                connection,
                auctionView,
                mintRentExempt,
                wallet,
                winningBidder,
                item.safetyDeposit,
                item,
                signers,
                instructions,
                winnerIndex,
                prizeTrackingTickets,
              );
            }
          }
          printingV2ByMint[item.metadata.info.mint] = item;
          break;
        }
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
            winnerIndex,
          );
          break;
      }
    }
  }

  const allV2s = Object.values(printingV2ByMint);
  for (let i = 0; i < allV2s.length; i++) {
    const item = allV2s[i];
    await setupWithdrawMasterEditionInstructions(
      connection,
      auctionView,
      wallet,
      item.safetyDeposit,
      item,
      signers,
      instructions,
    );
  }
}

async function setupRedeemInstructions(
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  accountRentExempt: number,
  wallet: WalletSigner,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
  winningConfigIndex: number,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const winningPrizeSigner: Keypair[] = [];
  const winningPrizeInstructions: TransactionInstruction[] = [];

  signers.push(winningPrizeSigner);
  instructions.push(winningPrizeInstructions);
  const claimed = auctionView.auctionManager.isItemClaimed(
    winningConfigIndex,
    safetyDeposit.info.order,
  );

  if (!claimed) {
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
      wallet.publicKey.toBase58(),
      wallet.publicKey.toBase58(),
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
  wallet: WalletSigner,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  item: AuctionViewItem,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
  winningConfigIndex: number,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const winningPrizeSigner: Keypair[] = [];
  const winningPrizeInstructions: TransactionInstruction[] = [];
  const claimed = auctionView.auctionManager.isItemClaimed(
    winningConfigIndex,
    safetyDeposit.info.order,
  );
  signers.push(winningPrizeSigner);
  instructions.push(winningPrizeInstructions);
  if (!claimed) {
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
      wallet.publicKey.toBase58(),
      wallet.publicKey.toBase58(),
      winningPrizeInstructions,
      item.metadata.pubkey,
      wallet.publicKey.toBase58(),
      winningConfigIndex,
    );
  }
}

async function setupWithdrawMasterEditionInstructions(
  connection: Connection,
  auctionView: AuctionView,
  wallet: WalletSigner,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  item: AuctionViewItem,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

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
        toPublicKey(item.metadata.info.mint).toBuffer(),
      ],
      programIds().associatedToken,
    )
  )[0];

  const existingAta = await connection.getAccountInfo(toPublicKey(ata));
  console.log('Existing ata?', existingAta);
  if (!existingAta) {
    createAssociatedTokenAccountInstruction(
      myInstructions,
      toPublicKey(ata),
      wallet.publicKey,
      wallet.publicKey,
      toPublicKey(item.metadata.info.mint),
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
  wallet: WalletSigner,
  safetyDeposit: ParsedAccount<SafetyDepositBox>,
  item: AuctionViewItem,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
  winningConfigIndex: number,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  if (!item.masterEdition || !item.metadata) {
    return;
  }
  const updateAuth = item.metadata.info.updateAuthority;
  const me = item.masterEdition as ParsedAccount<MasterEditionV1>;
  const reservationList = await deprecatedGetReservationList(
    item.masterEdition.pubkey,
    auctionView.auctionManager.pubkey,
  );

  const newTokenAccount = accountsByMint.get(me.info.printingMint);
  let newTokenAccountKey = newTokenAccount?.pubkey;

  if (updateAuth) {
    const claimed = auctionView.auctionManager.isItemClaimed(
      winningConfigIndex,
      safetyDeposit.info.order,
    );
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
        wallet.publicKey.toBase58(),
        wallet.publicKey.toBase58(),
        item.masterEdition.pubkey,
        reservationList,
        true,
        winningPrizeInstructions,
        winningConfigIndex,
      );
    }
  }
}
