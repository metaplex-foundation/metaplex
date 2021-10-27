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
  AuctionDataExtended,
  createPipelineExecutor,
  pubkeyToString,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import BN from 'bn.js';
import { useEffect, useState } from 'react';
import {
  AuctionManager,
  AuctionManagerStatus,
  AuctionManagerV2,
  BidRedemptionTicket,
  BidRedemptionTicketV2,
  getBidderKeys,
  MetaplexKey,
  SafetyDepositConfig,
  WinningConfigType,
  AuctionViewItem,
} from '@oyster/common';
import {
  getAuctionDataExtendedByKey,
  getauctionManagersByKey,
  getAuctions,
  getBidderMetadataByAuctionAndBidder,
  getBidderPotsByAuctionAndBidder,
  getBidRedemptionV2sByAuctionManagerAndWinningIndexby,
  getGidRedemptionV2sByAuctionManagerAndWinningIndex,
  getMasterEditionsbyKey,
  getMasterEditionsbyMint,
  getMetadataByMasterEdition,
  getMetadatabyMint,
  getSafetyDepositBoxesByVaultAndIndexby,
  getSafetyDepositConfigsByAuctionManagerAndIndexby,
  getVault,
} from './getData';
import _ from 'lodash';

export enum AuctionViewState {
  Live = '0',
  Upcoming = '1',
  Ended = '2',
  BuyNow = '3',
  Defective = '-1',
}

// Flattened surface item for easy display
export interface AuctionView {
  // items 1:1 with winning configs FOR NOW
  // once tiered auctions come along, this becomes an array of arrays.
  items: AuctionViewItem[][];
  safetyDepositBoxes: ParsedAccount<SafetyDepositBox>[];
  auction: ParsedAccount<AuctionData>;
  auctionDataExtended?: ParsedAccount<AuctionDataExtended>;
  auctionManager: AuctionManager;
  participationItem?: AuctionViewItem;
  state: AuctionViewState;
  thumbnail: AuctionViewItem;
  myBidderMetadata?: ParsedAccount<BidderMetadata>;
  myBidderPot?: ParsedAccount<BidderPot>;
  myBidRedemption?: ParsedAccount<BidRedemptionTicket>;
  vault: ParsedAccount<Vault>;
  totallyComplete: boolean;
  isInstantSale: boolean;
}

type CachedRedemptionKeys = Record<
  string,
  ParsedAccount<BidRedemptionTicket> | { pubkey: StringPublicKey; info: null }
>;

export function useStoreAuctionsList() {
  const [result, setResult] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const arr = await getAuctions();
      if (arr.length > 0) setResult(arr);
    })();
  }, []);

  return result;
}

export function useCachedRedemptionKeysByWallet() {
  const auctions = useStoreAuctionsList();

  const { publicKey } = useWallet();
  const [cachedRedemptionKeys, setCachedRedemptionKeys] =
    useState<CachedRedemptionKeys>({});

  useEffect(() => {
    if (!publicKey) return;
    (async () => {
      const temp: CachedRedemptionKeys = {};
      await createPipelineExecutor(
        auctions.values(),
        async auction => {
          if (!cachedRedemptionKeys[auction.pubkey]) {
            const key = await getBidderKeys(auction.pubkey, publicKey.toBase58());
            let res = await getGidRedemptionV2sByAuctionManagerAndWinningIndex(
              'bidRedemptionTicketsV1',
              key.bidRedemption,
            );
            if (!res || res.length == 0) {
              res = await getGidRedemptionV2sByAuctionManagerAndWinningIndex(
                'bidRedemptionTicketsV2',
                key.bidRedemption,
              );
            }
            if (_.isEmpty(res)) res = false;
            temp[auction.pubkey] = res
              ? res
              : { pubkey: key.bidRedemption, info: null };
          } else if (!cachedRedemptionKeys[auction.pubkey].info) {
            let req = await getGidRedemptionV2sByAuctionManagerAndWinningIndex(
              'bidRedemptionTicketsV1',
              cachedRedemptionKeys[auction.pubkey].pubkey,
            );
            if (!req || req.length == 0) {
              req = await getGidRedemptionV2sByAuctionManagerAndWinningIndex(
                'bidRedemptionTicketsV2',
                cachedRedemptionKeys[auction.pubkey].pubkey,
              );
            }
            if (_.isEmpty(req)) req = false;
            temp[auction.pubkey] = req || cachedRedemptionKeys[auction.pubkey];
          }
        },
        { delay: 1, sequence: 2 },
      );

      setCachedRedemptionKeys(temp);
    })();
  }, [auctions, publicKey]);

  return cachedRedemptionKeys;
}

export const useAuctions = (state?: AuctionViewState) => {
  const [auctionViews, setAuctionViews] = useState<AuctionView[]>([]);
  const { publicKey } = useWallet();
  const cachedRedemptionKeys = useCachedRedemptionKeysByWallet();
  const auctions = useStoreAuctionsList();

  useEffect(() => {
    (async () => {
      const auctionViews: AuctionView[] = [];

      await createPipelineExecutor(
        auctions.values(),
        async auction => {
          const auctionView = await processAccountsIntoAuctionView(
            publicKey?.toBase58(),
            auction,
            cachedRedemptionKeys,
            state,
          );
          if (auctionView) {
            auctionViews.push(auctionView);
          }
        },
        { delay: 1, sequence: 2 },
      );
      setAuctionViews(auctionViews.sort(sortByEnded));
    })();
  }, [state, auctions, publicKey, cachedRedemptionKeys, setAuctionViews]);

  return auctionViews;
};

function sortByEnded(a: AuctionView, b: AuctionView) {
  return (
    (b.auction.info.endedAt?.toNumber() || 0) -
    (a.auction.info.endedAt?.toNumber() || 0)
  );
}

function isInstantSale(
  auctionDataExt: ParsedAccount<AuctionDataExtended> | null,
  auction: ParsedAccount<AuctionData>,
) {
  return !!(
    auctionDataExt?.info.instantSalePrice &&
    auction.info.priceFloor.minPrice &&
    auctionDataExt?.info.instantSalePrice.eq(auction.info.priceFloor.minPrice)
  );
}

async function buildListWhileNonZero<T>(hash: string, key: string) {
  const list: T[] = [];
  let ticket;
  if (hash == 'vault')
    ticket = await getSafetyDepositBoxesByVaultAndIndexby(key, '0');
  else if (hash == 'safety')
    ticket = await getSafetyDepositConfigsByAuctionManagerAndIndexby(key, '0');
  else if (hash == 'bidRed') {
    ticket = await getBidRedemptionV2sByAuctionManagerAndWinningIndexby(
      key,
      '0',
    );
  }
  if (ticket) {
    list.push(ticket);
    let i = 1;
    while (ticket && ticket.length > 0) {
      if (hash == 'vault')
        ticket = await getSafetyDepositBoxesByVaultAndIndexby(
          key,
          i.toString(),
        );
      else if (hash == 'safety')
        ticket = await getSafetyDepositConfigsByAuctionManagerAndIndexby(
          key,
          i.toString(),
        );
      else if (hash == 'bidRed') {
        ticket = await getBidRedemptionV2sByAuctionManagerAndWinningIndexby(
          key,
          i.toString(),
        );
      }
      if (ticket) list.push(ticket);
      i++;
    }
  }
  return list;
}

export async function processAccountsIntoAuctionView(
  walletPubkey: StringPublicKey | null | undefined,
  auction: ParsedAccount<AuctionData>,
  cachedRedemptionKeysByWallet: Record<
    string,
    ParsedAccount<BidRedemptionTicket> | { pubkey: StringPublicKey; info: null }
  >,
  desiredState: AuctionViewState | undefined,
  existingAuctionView?: AuctionView,
): Promise<AuctionView | undefined> {
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

  const auctionManagerInstance = await getauctionManagersByKey(
    auction.pubkey || '',
  );
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

    const vault = await getVault(auctionManagerInstance.info.vault);
    const auctionManagerKey = auctionManagerInstance.pubkey;

    const safetyDepositConfigs: ParsedAccount<SafetyDepositConfig>[] =
      await buildListWhileNonZero('safety', auctionManagerKey);

    const bidRedemptions: ParsedAccount<BidRedemptionTicketV2>[] =
      await buildListWhileNonZero('bidRed', auctionManagerKey);
    const auctionManager = new AuctionManager({
      instance: auctionManagerInstance,
      auction,
      vault,
      safetyDepositConfigs,
      bidRedemptions,
    });

    const auctionDataExtendedKey =
      auctionManagerInstance.info.key == MetaplexKey.AuctionManagerV2
        ? (auctionManagerInstance as ParsedAccount<AuctionManagerV2>).info
            .auctionDataExtended
        : null;
    const auctionDataExt = auctionDataExtendedKey
      ? await getAuctionDataExtendedByKey(auctionDataExtendedKey)
      : null;

    const boxesExpected = auctionManager.safetyDepositBoxesExpected.toNumber();

    const bidRedemption: ParsedAccount<BidRedemptionTicket> | undefined =
      cachedRedemptionKeysByWallet[auction.pubkey]?.info
        ? (cachedRedemptionKeysByWallet[
            auction.pubkey
          ] as ParsedAccount<BidRedemptionTicket>)
        : undefined;

    const bidderMetadata = await getBidderMetadataByAuctionAndBidder(
      auction.pubkey,
      pubkeyToString(walletPubkey),
    );
    const bidderPot = await getBidderPotsByAuctionAndBidder(
      auction.pubkey,
      pubkeyToString(walletPubkey),
    );

    if (existingAuctionView && existingAuctionView.totallyComplete) {
      // If totally complete, we know we arent updating anythign else, let's speed things up
      // and only update the two things that could possibly change
      existingAuctionView.auction = auction;
      existingAuctionView.myBidderPot = bidderPot;
      existingAuctionView.myBidderMetadata = bidderMetadata;
      existingAuctionView.myBidRedemption = bidRedemption;
      existingAuctionView.auctionDataExtended = auctionDataExt || undefined;
      existingAuctionView.vault = vault;
      existingAuctionView.isInstantSale = isInstantSale(
        auctionDataExt,
        auction,
      );
      for (let i = 0; i < existingAuctionView.items.length; i++) {
        const winningSet = existingAuctionView.items[i];
        for (let j = 0; j < winningSet.length; j++) {
          const curr = winningSet[j];
          if (!curr.metadata) {
            let foundMetadata = await getMetadatabyMint(
              curr.safetyDeposit.info.tokenMint,
            );
            if (!foundMetadata) {
              // Means is a limited edition, so the tokenMint is the printingMint
              const masterEdition = await getMasterEditionsbyMint(
                'masterEditionsV1',
                curr.safetyDeposit.info.tokenMint,
              );
              if (masterEdition) {
                foundMetadata = await getMetadataByMasterEdition(
                  masterEdition.pubkey,
                );
              }
            }
            curr.metadata = foundMetadata;
          }

          if (
            curr.metadata &&
            !curr.masterEdition &&
            curr.metadata?.info?.masterEdition
          ) {
            const V1 = await getMasterEditionsbyKey(
              'masterEditionsV1',
              curr.metadata?.info?.masterEdition,
            );
            const V2 = await getMasterEditionsbyKey(
              'masterEditionsV2',
              curr.metadata?.info?.masterEdition,
            );
            const foundMaster = !_.isEmpty(V1)
              ? V1
              : !_.isEmpty(V2)
              ? V2
              : undefined;

            curr.masterEdition = foundMaster;
          }
        }
      }

      return existingAuctionView;
    }

    const vaultKey = auctionManager.vault;
    const boxes: ParsedAccount<SafetyDepositBox>[] =
      await buildListWhileNonZero('vault', vaultKey);
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
          (await getMetadataByMasterEdition(
            (
              await getMasterEditionsbyMint(
                'masterEditionsV1',
                participationBox.info.tokenMint,
              )
            )?.pubkey,
          )) || (await getMetadatabyMint(participationBox.info.tokenMint));
        if (participationMetadata) {
          const V1 = await getMasterEditionsbyKey(
            'masterEditionsV1',
            participationMetadata.info.masterEdition || '',
          );
          const V2 = await getMasterEditionsbyKey(
            'masterEditionsV2',
            participationMetadata.info.masterEdition || '',
          );
          participationMaster =
            (await getMasterEditionsbyMint(
              'masterEditionsV1',
              participationBox.info.tokenMint,
            )) ||
            (participationMetadata.info.masterEdition &&
              (!_.isEmpty(V1) ? V1 : !_.isEmpty(V2) ? V2 : undefined));
        }
      }
      const itemner = await auctionManager.getItemsFromSafetyDepositBoxes(
        boxes,
      );
      const view: Partial<AuctionView> = {
        auction,
        auctionManager,
        state,
        vault,
        auctionDataExtended: auctionDataExt || undefined,
        safetyDepositBoxes: boxes,
        items: itemner,
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

      view.isInstantSale = isInstantSale(auctionDataExt, auction);

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
