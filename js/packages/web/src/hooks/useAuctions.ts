import {
  ParsedAccount,
  Metadata,
  SafetyDepositBox,
  AuctionData,
  AuctionState,
  BidderMetadata,
  BidderPot,
  Vault,
  MasterEditionV1,
  MasterEditionV2,
  StringPublicKey,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import BN from 'bn.js';
import { useEffect, useState } from 'react';
import { useMeta } from '../contexts';
import {
  AuctionManager,
  AuctionManagerStatus,
  AuctionManagerV2,
  BidRedemptionTicket,
  BidRedemptionTicketV2,
  getBidderKeys,
  SafetyDepositConfig,
  WinningConfigType,
} from '../models/metaplex';
import { AuctionManagerV1 } from '../models/metaplex/deprecatedStates';

export enum AuctionViewState {
  Live = '0',
  Upcoming = '1',
  Ended = '2',
  BuyNow = '3',
  Defective = '-1',
}

export interface AuctionViewItem {
  winningConfigType: WinningConfigType;
  amount: BN;
  metadata: ParsedAccount<Metadata>;
  safetyDeposit: ParsedAccount<SafetyDepositBox>;
  masterEdition?: ParsedAccount<MasterEditionV1 | MasterEditionV2>;
}

// Flattened surface item for easy display
export interface AuctionView {
  // items 1:1 with winning configs FOR NOW
  // once tiered auctions come along, this becomes an array of arrays.
  items: AuctionViewItem[][];
  auction: ParsedAccount<AuctionData>;
  auctionManager: AuctionManager;
  participationItem?: AuctionViewItem;
  state: AuctionViewState;
  thumbnail: AuctionViewItem;
  myBidderMetadata?: ParsedAccount<BidderMetadata>;
  myBidderPot?: ParsedAccount<BidderPot>;
  myBidRedemption?: ParsedAccount<BidRedemptionTicket>;
  vault: ParsedAccount<Vault>;
  totallyComplete: boolean;
}

export function useCachedRedemptionKeysByWallet() {
  const { auctions, bidRedemptions } = useMeta();
  const { publicKey } = useWallet();

  const [cachedRedemptionKeys, setCachedRedemptionKeys] = useState<
    Record<
      string,
      | ParsedAccount<BidRedemptionTicket>
      | { pubkey: StringPublicKey; info: null }
    >
  >({});

  useEffect(() => {
    (async () => {
      if (publicKey) {
        const temp: Record<
          string,
          | ParsedAccount<BidRedemptionTicket>
          | { pubkey: StringPublicKey; info: null }
        > = {};
        const keys = Object.keys(auctions);
        const tasks: Promise<void>[] = [];
        for (let i = 0; i < keys.length; i++) {
          const a = keys[i];
          if (!cachedRedemptionKeys[a])
            tasks.push(
              getBidderKeys(auctions[a].pubkey, publicKey.toBase58()).then(
                key => {
                  temp[a] = bidRedemptions[key.bidRedemption]
                    ? bidRedemptions[key.bidRedemption]
                    : { pubkey: key.bidRedemption, info: null };
                },
              ),
            );
          else if (!cachedRedemptionKeys[a].info) {
            temp[a] =
              bidRedemptions[cachedRedemptionKeys[a].pubkey] ||
              cachedRedemptionKeys[a];
          }
        }

        await Promise.all(tasks);

        setCachedRedemptionKeys(temp);
      }
    })();
  }, [auctions, bidRedemptions, publicKey]);

  return cachedRedemptionKeys;
}

export const useAuctions = (state?: AuctionViewState) => {
  const [auctionViews, setAuctionViews] = useState<AuctionView[]>([]);
  const { publicKey } = useWallet();
  const cachedRedemptionKeys = useCachedRedemptionKeysByWallet();

  const {
    auctions,
    auctionManagersByAuction,
    safetyDepositBoxesByVaultAndIndex,
    metadataByMint,
    bidderMetadataByAuctionAndBidder,
    bidderPotsByAuctionAndBidder,
    vaults,
    masterEditions,
    masterEditionsByPrintingMint,
    masterEditionsByOneTimeAuthMint,
    metadataByMasterEdition,
    safetyDepositConfigsByAuctionManagerAndIndex,
    bidRedemptionV2sByAuctionManagerAndWinningIndex,
  } = useMeta();

  useEffect(() => {
    const map = Object.keys(auctions).reduce((agg, a) => {
      const auction = auctions[a];
      const nextAuctionView = processAccountsIntoAuctionView(
        publicKey?.toBase58(),
        auction,
        auctionManagersByAuction,
        safetyDepositBoxesByVaultAndIndex,
        metadataByMint,
        bidderMetadataByAuctionAndBidder,
        bidderPotsByAuctionAndBidder,
        bidRedemptionV2sByAuctionManagerAndWinningIndex,
        masterEditions,
        vaults,
        safetyDepositConfigsByAuctionManagerAndIndex,
        masterEditionsByPrintingMint,
        masterEditionsByOneTimeAuthMint,
        metadataByMasterEdition,
        cachedRedemptionKeys,
        state,
      );
      agg[a] = nextAuctionView;
      return agg;
    }, {} as Record<string, AuctionView | undefined>);

    setAuctionViews(
      (Object.values(map).filter(v => v) as AuctionView[]).sort((a, b) => {
        return (
          b?.auction.info.endedAt
            ?.sub(a?.auction.info.endedAt || new BN(0))
            .toNumber() || 0
        );
      }),
    );
  }, [
    state,
    auctions,
    auctionManagersByAuction,
    safetyDepositBoxesByVaultAndIndex,
    metadataByMint,
    bidderMetadataByAuctionAndBidder,
    bidderPotsByAuctionAndBidder,
    bidRedemptionV2sByAuctionManagerAndWinningIndex,
    vaults,
    safetyDepositConfigsByAuctionManagerAndIndex,
    masterEditions,
    masterEditionsByPrintingMint,
    masterEditionsByOneTimeAuthMint,
    metadataByMasterEdition,
    publicKey,
    cachedRedemptionKeys,
    setAuctionViews,
  ]);

  return auctionViews;
};

function buildListWhileNonZero<T>(hash: Record<string, T>, key: string) {
  const list: T[] = [];
  let ticket = hash[key + '-0'];
  if (ticket) {
    list.push(ticket);
    let i = 1;
    while (ticket) {
      ticket = hash[key + '-' + i.toString()];
      if (ticket) list.push(ticket);
      i++;
    }
  }
  return list;
}

export function processAccountsIntoAuctionView(
  walletPubkey: StringPublicKey | null | undefined,
  auction: ParsedAccount<AuctionData>,
  auctionManagersByAuction: Record<
    string,
    ParsedAccount<AuctionManagerV1 | AuctionManagerV2>
  >,
  safetyDepositBoxesByVaultAndIndex: Record<
    string,
    ParsedAccount<SafetyDepositBox>
  >,
  metadataByMint: Record<string, ParsedAccount<Metadata>>,
  bidderMetadataByAuctionAndBidder: Record<
    string,
    ParsedAccount<BidderMetadata>
  >,
  bidderPotsByAuctionAndBidder: Record<string, ParsedAccount<BidderPot>>,
  bidRedemptionV2sByAuctionManagerAndWinningIndex: Record<
    string,
    ParsedAccount<BidRedemptionTicketV2>
  >,
  masterEditions: Record<
    string,
    ParsedAccount<MasterEditionV1 | MasterEditionV2>
  >,
  vaults: Record<string, ParsedAccount<Vault>>,
  safetyDepositConfigsByAuctionManagerAndIndex: Record<
    string,
    ParsedAccount<SafetyDepositConfig>
  >,
  masterEditionsByPrintingMint: Record<string, ParsedAccount<MasterEditionV1>>,
  masterEditionsByOneTimeAuthMint: Record<
    string,
    ParsedAccount<MasterEditionV1>
  >,
  metadataByMasterEdition: Record<string, ParsedAccount<Metadata>>,
  cachedRedemptionKeysByWallet: Record<
    string,
    ParsedAccount<BidRedemptionTicket> | { pubkey: StringPublicKey; info: null }
  >,
  desiredState: AuctionViewState | undefined,
  existingAuctionView?: AuctionView,
): AuctionView | undefined {
  let state: AuctionViewState;
  if (auction.info.ended()) {
    state = AuctionViewState.Ended;
  } else if (auction.info.state === AuctionState.Started) {
    state = AuctionViewState.Live;
  } else if (auction.info.state === AuctionState.Created) {
    state = AuctionViewState.Upcoming;
  } else {
    state = AuctionViewState.BuyNow;
  }

  const auctionManagerInstance = auctionManagersByAuction[auction.pubkey || ''];

  // The defective auction view state really applies to auction managers, not auctions, so we ignore it here
  if (
    desiredState &&
    desiredState !== AuctionViewState.Defective &&
    desiredState !== state
  )
    return undefined;

  if (auctionManagerInstance) {
    // instead we apply defective state to auction managers
    if (
      desiredState === AuctionViewState.Defective &&
      auctionManagerInstance.info.state.status !==
        AuctionManagerStatus.Initialized
    )
      return undefined;
    // Generally the only way an initialized auction manager can get through is if you are asking for defective ones.
    else if (
      desiredState !== AuctionViewState.Defective &&
      auctionManagerInstance.info.state.status ===
        AuctionManagerStatus.Initialized
    )
      return undefined;

    const vault = vaults[auctionManagerInstance.info.vault];
    const auctionManagerKey = auctionManagerInstance.pubkey;

    let safetyDepositConfigs: ParsedAccount<SafetyDepositConfig>[] =
      buildListWhileNonZero(
        safetyDepositConfigsByAuctionManagerAndIndex,
        auctionManagerKey,
      );

    let bidRedemptions: ParsedAccount<BidRedemptionTicketV2>[] =
      buildListWhileNonZero(
        bidRedemptionV2sByAuctionManagerAndWinningIndex,
        auctionManagerKey,
      );
    const auctionManager = new AuctionManager({
      instance: auctionManagerInstance,
      auction,
      vault,
      safetyDepositConfigs,
      bidRedemptions,
    });

    const boxesExpected = auctionManager.safetyDepositBoxesExpected.toNumber();

    let bidRedemption: ParsedAccount<BidRedemptionTicket> | undefined =
      cachedRedemptionKeysByWallet[auction.pubkey]?.info
        ? (cachedRedemptionKeysByWallet[
            auction.pubkey
          ] as ParsedAccount<BidRedemptionTicket>)
        : undefined;

    const bidderMetadata =
      bidderMetadataByAuctionAndBidder[auction.pubkey + '-' + walletPubkey];
    const bidderPot =
      bidderPotsByAuctionAndBidder[auction.pubkey + '-' + walletPubkey];

    if (existingAuctionView && existingAuctionView.totallyComplete) {
      // If totally complete, we know we arent updating anythign else, let's speed things up
      // and only update the two things that could possibly change
      existingAuctionView.myBidderPot = bidderPot;
      existingAuctionView.myBidderMetadata = bidderMetadata;
      existingAuctionView.myBidRedemption = bidRedemption;
      for (let i = 0; i < existingAuctionView.items.length; i++) {
        const winningSet = existingAuctionView.items[i];
        for (let j = 0; j < winningSet.length; j++) {
          const curr = winningSet[j];
          if (!curr.metadata) {
            let foundMetadata =
              metadataByMint[curr.safetyDeposit.info.tokenMint];
            if (!foundMetadata) {
              // Means is a limited edition, so the tokenMint is the printingMint
              let masterEdition =
                masterEditionsByPrintingMint[curr.safetyDeposit.info.tokenMint];
              if (masterEdition) {
                foundMetadata = metadataByMasterEdition[masterEdition.pubkey];
              }
            }
            curr.metadata = foundMetadata;
          }

          if (
            curr.metadata &&
            !curr.masterEdition &&
            curr.metadata.info.masterEdition
          ) {
            let foundMaster = masterEditions[curr.metadata.info.masterEdition];

            curr.masterEdition = foundMaster;
          }
        }
      }

      return existingAuctionView;
    }

    const vaultKey = auctionManager.vault;
    let boxes: ParsedAccount<SafetyDepositBox>[] = buildListWhileNonZero(
      safetyDepositBoxesByVaultAndIndex,
      vaultKey,
    );
    if (boxes.length > 0) {
      let participationMetadata: ParsedAccount<Metadata> | undefined =
        undefined;
      let participationBox: ParsedAccount<SafetyDepositBox> | undefined =
        undefined;
      let participationMaster:
        | ParsedAccount<MasterEditionV1 | MasterEditionV2>
        | undefined = undefined;
      if (
        auctionManager.participationConfig !== null &&
        auctionManager.participationConfig !== undefined
      ) {
        participationBox =
          boxes[auctionManager.participationConfig?.safetyDepositBoxIndex];
        // Cover case of V1 master edition (where we're using one time auth mint in storage)
        // and case of v2 master edition where the edition itself is stored
        participationMetadata =
          metadataByMasterEdition[
            masterEditionsByOneTimeAuthMint[participationBox.info.tokenMint]
              ?.pubkey
          ] || metadataByMint[participationBox.info.tokenMint];
        if (participationMetadata) {
          participationMaster =
            masterEditionsByOneTimeAuthMint[participationBox.info.tokenMint] ||
            (participationMetadata.info.masterEdition &&
              masterEditions[participationMetadata.info.masterEdition]);
        }
      }

      let view: Partial<AuctionView> = {
        auction,
        auctionManager,
        state,
        vault,
        items: auctionManager.getItemsFromSafetyDepositBoxes(
          metadataByMint,
          masterEditionsByPrintingMint,
          metadataByMasterEdition,
          masterEditions,
          boxes,
        ),
        participationItem:
          participationMetadata && participationBox
            ? {
                metadata: participationMetadata,
                safetyDeposit: participationBox,
                masterEdition: participationMaster,
                amount: new BN(1),
                winningConfigType: WinningConfigType.Participation,
              }
            : undefined,
        myBidderMetadata: bidderMetadata,
        myBidderPot: bidderPot,
        myBidRedemption: bidRedemption,
      };

      view.thumbnail =
        ((view.items || [])[0] || [])[0] || view.participationItem;

      view.totallyComplete = !!(
        view.thumbnail &&
        boxesExpected ===
          (view.items || []).length +
            (auctionManager.participationConfig === null ||
            auctionManager.participationConfig === undefined
              ? 0
              : 1) &&
        (auctionManager.participationConfig === null ||
          auctionManager.participationConfig === undefined ||
          (auctionManager.participationConfig !== null &&
            view.participationItem)) &&
        view.vault
      );
      if (
        (!view.thumbnail || !view.thumbnail.metadata) &&
        desiredState != AuctionViewState.Defective
      )
        return undefined;

      return view as AuctionView;
    }
  }

  return undefined;
}
