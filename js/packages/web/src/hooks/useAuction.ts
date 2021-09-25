import { StringPublicKey, loadAuction, useConnection } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { merge } from 'lodash'
import {
  AuctionView,
  assembleAuctionView,
  useCachedRedemptionKeysByWallet,
} from '.';
import { useMeta } from '../contexts';

export const useAuction = (id: StringPublicKey) => {
  const { publicKey } = useWallet();
  const cachedRedemptionKeys = useCachedRedemptionKeysByWallet();
  const connection = useConnection()

  const [auctionView, setAuctionView] =
    useState<AuctionView | undefined>(undefined);
  const walletPubkey = publicKey?.toBase58();
  const {
    isLoading,
    auctionManagersByAuction,
    auctions,
    ...metaState
  } = useMeta();

  useEffect(() => {
    if (isLoading) {
      return
    }

    const auctionManager = auctionManagersByAuction[id];
    const auction = auctions[id];

    if (!auctionManager) {
      return
    }

    (async () => {
      const auctionState = await loadAuction(connection, auctionManager, true)

      const view = assembleAuctionView(
        walletPubkey,
        auctionManager,
        auction,
        cachedRedemptionKeys,
        merge({}, metaState, auctionState)
      );

      setAuctionView(view)


    })()
  }, [id, isLoading])

  return auctionView;
};
