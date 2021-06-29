import {
  ParsedAccount,
  Metadata,
  SafetyDepositBox,
  AuctionData,
  AuctionState,
  BidderMetadata,
  BidderPot,
  Vault,
  MasterEdition,
  useWallet,
} from '@oyster/common';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { useEffect, useState } from 'react';
import { useMeta } from '../contexts';
import {
  AuctionManager,
  AuctionManagerStatus,
  BidRedemptionTicket,
  getBidderKeys,
} from '../models/metaplex';

export enum AuctionViewState {
  Live = '0',
  Upcoming = '1',
  Ended = '2',
  BuyNow = '3',
  Defective = '-1',
}

export interface AuctionViewItem {
  metadata: ParsedAccount<Metadata>;
  safetyDeposit: ParsedAccount<SafetyDepositBox>;
  masterEdition?: ParsedAccount<MasterEdition>;
}

// Flattened surface item for easy display
export interface AuctionView {
  // items 1:1 with winning configs FOR NOW
  // once tiered auctions come along, this becomes an array of arrays.
  items: AuctionViewItem[][];
  auction: ParsedAccount<AuctionData>;
  auctionManager: ParsedAccount<AuctionManager>;
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
  const { wallet } = useWallet();

  const [cachedRedemptionKeys, setCachedRedemptionKeys] = useState<
    Record<
      string,
      ParsedAccount<BidRedemptionTicket> | { pubkey: PublicKey; info: null }
    >
  >({});

  useEffect(() => {
    (async () => {
      if (wallet && wallet.publicKey) {
        const temp: Record<
          string,
          ParsedAccount<BidRedemptionTicket> | { pubkey: PublicKey; info: null }
        > = {};
        const keys = Object.keys(auctions);
        const tasks = [];
        for (let i = 0; i < keys.length; i++) {
          const a = keys[i];
          if (!cachedRedemptionKeys[a])
            //@ts-ignore
            tasks.push(
              getBidderKeys(auctions[a].pubkey, wallet.publicKey).then(key => {
                temp[a] = bidRedemptions[key.bidRedemption.toBase58()]
                  ? bidRedemptions[key.bidRedemption.toBase58()]
                  : { pubkey: key.bidRedemption, info: null };
              }),
            );
          else if (!cachedRedemptionKeys[a].info) {
            temp[a] =
              bidRedemptions[cachedRedemptionKeys[a].pubkey.toBase58()] ||
              cachedRedemptionKeys[a];
          }
        }

        await Promise.all(tasks);

        setCachedRedemptionKeys(temp);
      }
    })();
  }, [auctions, bidRedemptions, wallet?.publicKey]);

  return cachedRedemptionKeys;
}

export const useAuctions = (state?: AuctionViewState) => {
  const [auctionViews, setAuctionViews] = useState<
    Record<string, AuctionView | undefined>
  >({});
  const { wallet } = useWallet();

  const pubkey = wallet?.publicKey;
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
  } = useMeta();

  useEffect(() => {
    Object.keys(auctions).forEach(a => {
      const auction = auctions[a];
      const existingAuctionView = auctionViews[a];
      const nextAuctionView = processAccountsIntoAuctionView(
        pubkey,
        auction,
        auctionManagersByAuction,
        safetyDepositBoxesByVaultAndIndex,
        metadataByMint,
        bidderMetadataByAuctionAndBidder,
        bidderPotsByAuctionAndBidder,
        masterEditions,
        vaults,
        masterEditionsByPrintingMint,
        masterEditionsByOneTimeAuthMint,
        metadataByMasterEdition,
        cachedRedemptionKeys,
        state,
        existingAuctionView,
      );
      setAuctionViews(nA => ({ ...nA, [a]: nextAuctionView }));
    });
  }, [
    state,
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
    pubkey,
    cachedRedemptionKeys,
  ]);

  return (Object.values(auctionViews).filter(v => v) as AuctionView[]).sort(
    (a, b) => {
      return (
        b?.auction.info.endedAt
          ?.sub(a?.auction.info.endedAt || new BN(0))
          .toNumber() || 0
      );
    },
  );
};

export function processAccountsIntoAuctionView(
  walletPubkey: PublicKey | null | undefined,
  auction: ParsedAccount<AuctionData>,
  auctionManagersByAuction: Record<string, ParsedAccount<AuctionManager>>,
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
  masterEditions: Record<string, ParsedAccount<MasterEdition>>,
  vaults: Record<string, ParsedAccount<Vault>>,
  masterEditionsByPrintingMint: Record<string, ParsedAccount<MasterEdition>>,
  masterEditionsByOneTimeAuthMint: Record<string, ParsedAccount<MasterEdition>>,
  metadataByMasterEdition: Record<string, ParsedAccount<Metadata>>,
  cachedRedemptionKeysByWallet: Record<
    string,
    ParsedAccount<BidRedemptionTicket> | { pubkey: PublicKey; info: null }
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

  const auctionManager =
    auctionManagersByAuction[auction.pubkey.toBase58() || ''];

  // The defective auction view state really applies to auction managers, not auctions, so we ignore it here
  if (
    desiredState &&
    desiredState !== AuctionViewState.Defective &&
    desiredState !== state
  )
    return undefined;

  if (auctionManager) {
    // instead we apply defective state to auction managers
    if (
      desiredState === AuctionViewState.Defective &&
      auctionManager.info.state.status !== AuctionManagerStatus.Initialized
    )
      return undefined;
    // Generally the only way an initialized auction manager can get through is if you are asking for defective ones.
    else if (
      desiredState !== AuctionViewState.Defective &&
      auctionManager.info.state.status === AuctionManagerStatus.Initialized
    )
      return undefined;

    const boxesExpected = auctionManager.info.state.winningConfigItemsValidated;

    let bidRedemption: ParsedAccount<BidRedemptionTicket> | undefined =
      cachedRedemptionKeysByWallet[auction.pubkey.toBase58()]?.info
        ? (cachedRedemptionKeysByWallet[
            auction.pubkey.toBase58()
          ] as ParsedAccount<BidRedemptionTicket>)
        : undefined;

    const bidderMetadata =
      bidderMetadataByAuctionAndBidder[
        auction.pubkey.toBase58() + '-' + walletPubkey?.toBase58()
      ];
    const bidderPot =
      bidderPotsByAuctionAndBidder[
        auction.pubkey.toBase58() + '-' + walletPubkey?.toBase58()
      ];

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
              metadataByMint[curr.safetyDeposit.info.tokenMint.toBase58()];
            if (!foundMetadata) {
              // Means is a limited edition, so the tokenMint is the printingMint
              let masterEdition =
                masterEditionsByPrintingMint[
                  curr.safetyDeposit.info.tokenMint.toBase58()
                ];
              if (masterEdition) {
                foundMetadata =
                  metadataByMasterEdition[masterEdition.pubkey.toBase58()];
              }
            }
            curr.metadata = foundMetadata;
          }

          if (
            curr.metadata &&
            !curr.masterEdition &&
            curr.metadata.info.masterEdition
          ) {
            let foundMaster =
              masterEditions[curr.metadata.info.masterEdition.toBase58()];

            curr.masterEdition = foundMaster;
          }
        }
      }

      return existingAuctionView;
    }

    let boxes: ParsedAccount<SafetyDepositBox>[] = [];

    let box =
      safetyDepositBoxesByVaultAndIndex[
        auctionManager.info.vault.toBase58() + '-0'
      ];
    if (box) {
      boxes.push(box);
      let i = 1;
      while (box) {
        box =
          safetyDepositBoxesByVaultAndIndex[
            auctionManager.info.vault.toBase58() + '-' + i.toString()
          ];
        if (box) boxes.push(box);
        i++;
      }
    }

    if (boxes.length > 0) {
      let view: Partial<AuctionView> = {
        auction,
        auctionManager,
        state,
        vault: vaults[auctionManager.info.vault.toBase58()],
        items: auctionManager.info.settings.winningConfigs.map(w => {
          return w.items.map(it => {
            let metadata =
              metadataByMint[
                boxes[it.safetyDepositBoxIndex]?.info.tokenMint.toBase58()
              ];
            if (!metadata) {
              // Means is a limited edition, so the tokenMint is the printingMint
              let masterEdition =
                masterEditionsByPrintingMint[
                  boxes[it.safetyDepositBoxIndex]?.info.tokenMint.toBase58()
                ];
              if (masterEdition) {
                metadata =
                  metadataByMasterEdition[masterEdition.pubkey.toBase58()];
              }
            }
            return {
              metadata,
              safetyDeposit: boxes[it.safetyDepositBoxIndex],
              masterEdition: metadata?.info?.masterEdition
                ? masterEditions[metadata.info.masterEdition.toBase58()]
                : undefined,
            };
          });
        }),
        participationItem:
          auctionManager.info.settings.participationConfig !== null &&
          auctionManager.info.settings.participationConfig !== undefined
            ? {
                metadata:
                  metadataByMasterEdition[
                    masterEditionsByOneTimeAuthMint[
                      boxes[
                        auctionManager.info.settings.participationConfig
                          ?.safetyDepositBoxIndex
                      ]?.info.tokenMint.toBase58()
                    ]?.pubkey.toBase58()
                  ],
                safetyDeposit:
                  boxes[
                    auctionManager.info.settings.participationConfig
                      ?.safetyDepositBoxIndex
                  ],
                masterEdition:
                  masterEditionsByOneTimeAuthMint[
                    boxes[
                      auctionManager.info.settings.participationConfig
                        ?.safetyDepositBoxIndex
                    ]?.info.tokenMint.toBase58()
                  ],
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
            (auctionManager.info.settings.participationConfig === null ||
            auctionManager.info.settings.participationConfig === undefined
              ? 0
              : 1) &&
        (auctionManager.info.settings.participationConfig === null ||
          auctionManager.info.settings.participationConfig === undefined ||
          (auctionManager.info.settings.participationConfig !== null &&
            view.participationItem)) &&
        view.vault
      );

      if (!view.thumbnail || !view.thumbnail.metadata) return undefined;

      return view as AuctionView;
    }
  }

  return undefined;
}
