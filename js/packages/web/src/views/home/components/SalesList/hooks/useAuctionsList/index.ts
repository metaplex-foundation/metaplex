// import { useEffect, useMemo } from 'react';
// import { useWallet } from '@solana/wallet-adapter-react';
// import { useAuctions, AuctionView, AuctionViewState, useExtendedArt } from '../../../../../../hooks'

// import { LiveAuctionViewState } from '../..';
// import { getFilterFunction, resaleAuctionsFilter } from './utils';
// import { useMeta } from '@oyster/common';

// export const useAuctionsList = (
//   activeKey: LiveAuctionViewState = LiveAuctionViewState.All
// ): { auctions: AuctionView[]; hasResaleAuctions: boolean } => {
//   const { publicKey } = useWallet();
//   const auctions = useAuctions();
//   const { pullAuctionListData, isLoading } = useMeta();

//   useEffect(() => {
//     if (!auctions.length || isLoading) return;
//     for (const auction of auctions) {
//       pullAuctionListData(auction.auction.pubkey);
//     }
//   }, [auctions.length, isLoading]);

//   const getMoreData = async itemuri => {
//     const USE_CDN = false
//     const routeCDN = (uri: string) => {
//       let result = uri
//       if (USE_CDN) {
//         result = uri.replace('https://arweave.net/', 'https://coldcdn.com/api/cdn/bronil/')
//       }

//       return result
//     }

//     if (itemuri) {
//       const uri = routeCDN(itemuri)

//       const processJson = (extended: any) => {
//         if (!extended || extended?.properties?.files?.length === 0) {
//           return
//         }

//         if (extended?.image) {
//           const file = extended.image.startsWith('http')
//             ? extended.image
//             : `${itemuri}/${extended.image}`
//           extended.image = routeCDN(file)
//         }

//         return extended
//       }
//       const data = await fetch(uri)
//       const rdata = processJson(data.json())

//       return rdata
//     }
//   }

//   const filteredAuctions = useMemo(() => {
//     const filterFn = getFilterFunction(activeKey)

//     return auctions.filter(auction => filterFn(auction, publicKey))
//   }, [activeKey, auctions, publicKey])

//   const hasResaleAuctions = useMemo(() => {
//     return auctions.some(auction => resaleAuctionsFilter(auction))
//   }, [auctions])

//   const getAllCollectionItems = useMemo(() => {
//     auctions.forEach(element => {
//       getMoreData(element.thumbnail.metadata.info.data.uri).then(e => {
//         element['moredata'] = e
//       })
//     })
//     return auctions
//   }, [auctions])

//   return { auctions: auctions, hasResaleAuctions }
// }

// export const useGroupedAuctionsList = (
//   activeKey: LiveAuctionViewState = LiveAuctionViewState.All
// ): { auctions: AuctionView[]; hasResaleAuctions: boolean } => {
//   const { auctions, hasResaleAuctions } = useAuctionsList()
//   if (!!auctions[0])
//     console.log((auctions[0].thumbnail.metadata.info.data.creators as any)[0].address)
//   // if (!!auctions[0]) console.log(auctions[0].thumbnail.metadata.info.data.creators != undefined)
//   return { auctions: auctions, hasResaleAuctions }
// }

import { useEffect, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

import { useAuctions, AuctionView } from '../../../../../../hooks'

import { LiveAuctionViewState } from '../..'
import { getFilterFunction, resaleAuctionsFilter } from './utils'
import { useMeta } from '@oyster/common'

export const useAuctionsList = (
  activeKey: LiveAuctionViewState = LiveAuctionViewState.All
): { auctions: AuctionView[]; hasResaleAuctions: boolean } => {
  const { publicKey } = useWallet()
  const auctions = useAuctions()
  const { pullAuctionListData, isLoading } = useMeta()

  useEffect(() => {
    if (!auctions.length || isLoading) return
    for (const auction of auctions) {
      pullAuctionListData(auction.auction.pubkey)
    }
  }, [auctions.length, isLoading])

  // const filteredAuctions = useMemo(() => {
  //   const filterFn = getFilterFunction(activeKey)

  //   return auctions.filter(auction => filterFn(auction, publicKey))
  // }, [activeKey, auctions, publicKey])

  const hasResaleAuctions = useMemo(() => {
    return auctions.some(auction => resaleAuctionsFilter(auction))
  }, [auctions])

  return { auctions: auctions, hasResaleAuctions }
}
