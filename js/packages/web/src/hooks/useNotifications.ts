import {
  ParsedAccount,
  AuctionData,
  Vault,
  AuctionManagerV1,
  AuctionManagerV2,
  AuctionState
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { AuctionViewState } from '.';
import { useMeta } from '../contexts';
import { useCachedRedemptionKeysByWallet } from '.';

export interface AuctionViewLimited {
  auctionManager: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>;
  auction: ParsedAccount<AuctionData>;
  vault: ParsedAccount<Vault>;
  state: AuctionViewState
}

export const useNotifications = () => {
  const metaState = useMeta();
  const { auctionManagersByAuction, auctions, vaults } = metaState;
  const cachedRedemptionKeys = useCachedRedemptionKeysByWallet();
  const [auctionViews, setAuctionLimitedViews] = useState<AuctionViewLimited[]>([]);
  const { publicKey } = useWallet();

  useEffect(() => {
    if (!publicKey) {
      return
    }

    const auctionViews = Object.keys(auctionManagersByAuction).map(
      (key): AuctionViewLimited => {
        const auctionManager = auctionManagersByAuction[key];
        const auction = auctions[auctionManager.info.auction];

        let state: AuctionViewState;
        if (auction.info.ended()) {
          state = AuctionViewState.Ended;
        } else if (auction.info.state === AuctionState.Started) {
          state = AuctionViewState.Live;
        } else if (auction.info.state === AuctionState.Created) {
          state = AuctionViewState.Upcoming;
        } else {
          state = AuctionViewState.Defective;
        }

        return {
          auctionManager,
          auction,
          vault: vaults[auctionManager.info.vault],
          state,
        };
      },
    );

    setAuctionLimitedViews(auctionViews)
  }, [publicKey, auctionManagersByAuction, auctions, vaults])

  return {
    ...metaState,
    cachedRedemptionKeys,
    auctionViews,
  }
};