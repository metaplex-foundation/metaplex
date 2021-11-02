import BN from 'bn.js';
import { MasterEditionV1, MasterEditionV2, Metadata } from '../metadata';
import { SafetyDepositBox, Vault } from '../vaults';
import { AuctionData } from '../auctions';
import { ParsedAccount } from '../accounts';
import { StringPublicKey } from '../../utils';
import { AuctionViewItem } from './AuctionViewItem';
import { AuctionManagerStatus } from './AuctionManagerStatus';
import { WinningConstraint } from './WinningConstraint';
import { NonWinningConstraint } from './NonWinningConstraint';
import { MetaplexKey } from './MetaplexKey';
import {
  AuctionManagerV1,
  AuctionManagerV2,
  BidRedemptionTicketV2,
  ParticipationConfigV1,
  SafetyDepositConfig,
} from './entities';

export class AuctionManager {
  pubkey: StringPublicKey;
  store: StringPublicKey;
  authority: StringPublicKey;
  auction: StringPublicKey;
  vault: StringPublicKey;
  acceptPayment: StringPublicKey;
  numWinners: BN;
  safetyDepositConfigs: ParsedAccount<SafetyDepositConfig>[];
  bidRedemptions: ParsedAccount<BidRedemptionTicketV2>[];
  instance: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>;
  status: AuctionManagerStatus;
  safetyDepositBoxesExpected: BN;
  participationConfig?: ParticipationConfigV1;

  constructor(args: {
    instance: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>;
    auction: ParsedAccount<AuctionData>;
    vault: ParsedAccount<Vault>;
    safetyDepositConfigs: ParsedAccount<SafetyDepositConfig>[];
    bidRedemptions: ParsedAccount<BidRedemptionTicketV2>[];
  }) {
    this.pubkey = args.instance.pubkey;
    this.instance = args.instance;
    this.numWinners = args.auction.info.bidState.max;
    this.safetyDepositBoxesExpected =
      this.instance.info.key == MetaplexKey.AuctionManagerV2
        ? new BN(args.vault.info.tokenTypeCount)
        : new BN(
            (
              this.instance.info as AuctionManagerV1
            ).state.winningConfigItemsValidated,
          );
    this.store = this.instance.info.store;
    this.authority = this.instance.info.authority;
    this.vault = this.instance.info.vault;
    this.acceptPayment = this.instance.info.acceptPayment;
    this.auction = this.instance.info.auction;
    this.status = this.instance.info.state.status;
    this.safetyDepositConfigs = args.safetyDepositConfigs;
    this.bidRedemptions = args.bidRedemptions;
    this.participationConfig =
      this.instance.info.key == MetaplexKey.AuctionManagerV2
        ? this.safetyDepositConfigs
            ?.filter(s => s.info.participationConfig)
            .map(s => ({
              winnerConstraint:
                s.info.participationConfig?.winnerConstraint ||
                WinningConstraint.NoParticipationPrize,
              nonWinningConstraint:
                s.info.participationConfig?.nonWinningConstraint ||
                NonWinningConstraint.GivenForFixedPrice,
              fixedPrice: s.info.participationConfig?.fixedPrice || null,
              safetyDepositBoxIndex: s.info.order.toNumber(),
            }))[0] || undefined
        : (this.instance.info as AuctionManagerV1).settings
            .participationConfig || undefined;
  }

  isItemClaimed(winnerIndex: number, safetyDepositBoxIndex: number): boolean {
    if (this.instance.info.key == MetaplexKey.AuctionManagerV1) {
      const asV1 = this.instance.info as AuctionManagerV1;
      const itemIndex = asV1.settings.winningConfigs[
        winnerIndex
      ].items.findIndex(i => i.safetyDepositBoxIndex == safetyDepositBoxIndex);

      return asV1.state.winningConfigStates[winnerIndex].items[itemIndex]
        .claimed;
    } else {
      const winner = this.bidRedemptions.find(
        b => b.info.winnerIndex && b.info.winnerIndex.eq(new BN(winnerIndex)),
      );
      if (!winner) {
        return false;
      } else {
        return winner.info.getBidRedeemed(safetyDepositBoxIndex);
      }
    }
  }

  getAmountForWinner(winnerIndex: number, safetyDepositBoxIndex: number): BN {
    if (this.instance.info.key == MetaplexKey.AuctionManagerV1) {
      return new BN(
        (this.instance.info as AuctionManagerV1).settings.winningConfigs[
          winnerIndex
        ].items.find(i => i.safetyDepositBoxIndex == safetyDepositBoxIndex)
          ?.amount || 0,
      );
    } else {
      const safetyDepositConfig =
        this.safetyDepositConfigs[safetyDepositBoxIndex];
      return safetyDepositConfig.info.getAmountForWinner(new BN(winnerIndex));
    }
  }

  getItemsFromSafetyDepositBoxes(
    metadataByMint: Record<string, ParsedAccount<Metadata>>,
    masterEditionsByPrintingMint: Record<
      string,
      ParsedAccount<MasterEditionV1>
    >,
    metadataByMasterEdition: Record<string, ParsedAccount<Metadata>>,
    masterEditions: Record<
      string,
      ParsedAccount<MasterEditionV1 | MasterEditionV2>
    >,
    boxes: ParsedAccount<SafetyDepositBox>[],
  ): AuctionViewItem[][] {
    if (this.instance.info.key == MetaplexKey.AuctionManagerV1) {
      return (
        this.instance.info as AuctionManagerV1
      ).settings.winningConfigs.map(w => {
        return w.items.map(it => {
          let metadata =
            metadataByMint[boxes[it.safetyDepositBoxIndex]?.info.tokenMint];
          if (!metadata) {
            // Means is a limited edition v1, so the tokenMint is the printingMint
            const masterEdition =
              masterEditionsByPrintingMint[
                boxes[it.safetyDepositBoxIndex]?.info.tokenMint
              ];
            if (masterEdition) {
              metadata = metadataByMasterEdition[masterEdition.pubkey];
            }
          }
          return {
            metadata,
            winningConfigType: it.winningConfigType,
            safetyDeposit: boxes[it.safetyDepositBoxIndex],
            amount: new BN(it.amount),
            masterEdition: metadata?.info?.masterEdition
              ? masterEditions[metadata.info.masterEdition]
              : undefined,
          };
        });
      });
    } else {
      const items: AuctionViewItem[][] = [];
      for (let i = 0; i < this.numWinners.toNumber(); i++) {
        const newWinnerArr: AuctionViewItem[] = [];
        items.push(newWinnerArr);
        this.safetyDepositConfigs?.forEach(s => {
          const amount = s.info.getAmountForWinner(new BN(i));
          if (amount.gt(new BN(0))) {
            const safetyDeposit = boxes[s.info.order.toNumber()];
            const metadata = metadataByMint[safetyDeposit.info.tokenMint];
            newWinnerArr.push({
              metadata,
              winningConfigType: s.info.winningConfigType,
              safetyDeposit,
              amount,
              masterEdition: metadata?.info?.masterEdition
                ? masterEditions[metadata.info.masterEdition]
                : undefined,
            });
          }
        });
      }
      return items;
    }
  }
}
