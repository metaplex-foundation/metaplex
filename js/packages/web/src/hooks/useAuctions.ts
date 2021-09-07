import { ParsedAccount, StringPublicKey } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import BN from 'bn.js';
import { useEffect, useState } from 'react';
import { useMeta } from '../contexts';
import {
  BidRedemptionTicket,
  getBidderKeys,
} from '@oyster/common/dist/lib/models/metaplex/index';
import {
  AuctionView,
  AuctionViewState,
  processAccountsIntoAuctionView,
} from '@oyster/common/dist/lib/models/auction';

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
