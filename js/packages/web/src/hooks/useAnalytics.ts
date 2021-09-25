import { ParsedAccount, AuctionManagerV1, AuctionManagerV2, getEmptyMetaState, loadAuction, useConnection, MetaState } from '@oyster/common';
import { useEffect, useState } from 'react';
import { merge } from 'lodash'
import { Connection } from '@solana/web3.js'
import { useMeta } from './../contexts'
import useDeepCompareEffect from 'use-deep-compare-effect';

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

const loadBidderPots = (connection: Connection, auctionManager: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>): MetaState => {
  return {} as MetaState
}

export const useAnalytics = () => {
  const [fetching, setFetching] = useState(true)
  const connection = useConnection()
  const {
    metadata,
    stores,
    auctionManagersByAuction,
    bidderPotsByAuctionAndBidder,
    auctionDataExtended,
    isLoading,
    updateMetaState
  } = useMeta();

  useDeepCompareEffect(() => {
    (async () => {
      if (isLoading) {
        return
      }
      
      Object
        .values(auctionManagersByAuction)
        .forEach(async auctionManager => {
          const auctionState = await loadBidderPots(connection, auctionManager)

          if (updateMetaState) {
            updateMetaState(auctionState);
          }
        })
        
        debugger;

      setFetching(false)
    })()
  }, [auctionManagersByAuction])

  return {
    isLoading: isLoading || fetching,
    metadata,
    stores,
    auctionManagersByAuction,
    bidderPotsByAuctionAndBidder,
    auctionDataExtended,
  }
}