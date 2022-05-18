import {
  cache,
  fromLamports,
  IMetadataExtension,
  MintParser,
  PriceFloorType,
  pubkeyToString,
  useConnection,
  WRAPPED_SOL_MINT,
} from '@oyster/common'
import { PublicKey } from '@solana/web3.js'
import { BN } from 'bn.js'
import { useEffect, useState } from 'react'
import { useAllSplPrices, useSolPrice } from '../../../contexts'
import { useTokenList } from '../../../contexts/tokenList'
import { AuctionView, useExtendedCollection } from '../../../hooks'
import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'
import { LiveAuctionViewState } from '../Home'

export interface Amounts {}

export interface NFTItemInterface extends AuctionView {
  offChainData: IMetadataExtension
  amounts: Amounts
}

export interface Attribute {
  trait_type: string
  values: Array<any>
}

// interface FilterFunctionInterface {
//   callBackFun: (items: NFTItemInterface) => void
// }

const useCollectionNFT = (id: string) => {
  const { auctions } = useAuctionsList(LiveAuctionViewState.All)
  const { getData } = useExtendedCollection()
  const [nftItems, setNFTItems] = useState<NFTItemInterface[]>([])
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [nftAuctions, setNFTAuctions] = useState<NFTItemInterface[]>([])
  const [owners, setOwners] = useState<Array<string>>([])
  const getMintData = useMintD()
  const tokenList = useTokenList()
  const allSplPrices = useAllSplPrices()
  const solPrice = useSolPrice()

  useEffect(() => {
    if (auctions) {
      const itemsArray: NFTItemInterface[] = []
      auctions
        .filter(auction => {
          return auction.thumbnail.metadata.info.collection?.key === pubkeyToString(id)
        })
        .forEach(auction => {
          const amounts = bindAmount(auction)
          getData(auction.thumbnail.metadata.pubkey).then(res => {
            itemsArray.push({ ...auction, offChainData: res, amounts })
          })
        })

      setNFTAuctions(itemsArray)
    }
  }, [auctions.length])

  useEffect(() => {
    if (nftAuctions) {
      setNFTItems(nftAuctions)
    }
  }, [nftAuctions.length])

  const bindAmount = auctionView => {
    const dx: any = getMintData(auctionView.auction.info.tokenMint)
    const participationFixedPrice = auctionView.auctionManager.participationConfig?.fixedPrice || 0
    const participationOnly = auctionView.auctionManager.numWinners.eq(new BN(0))
    const priceFloor =
      auctionView.auction.info.priceFloor.type === PriceFloorType.Minimum
        ? auctionView.auction.info.priceFloor.minPrice?.toNumber() || 0
        : 0
    const amount = fromLamports(participationOnly ? participationFixedPrice : priceFloor, dx.info)

    const tokenInfo = tokenList.subscribedTokens.filter(
      m => m.address == auctionView.auction.info.tokenMint
    )[0]

    const altSplPrice = allSplPrices.filter(a => a.tokenMint == tokenInfo?.address)[0]?.tokenPrice
    const tokenPrice = tokenInfo?.address == WRAPPED_SOL_MINT.toBase58() ? solPrice : altSplPrice
    const _floor = fromLamports(priceFloor ?? 0, dx.info)
    return { amount, usdAmount: tokenPrice * amount, priceFloor: _floor }
  }

  useEffect(() => {
    const aT: Attribute[] = []
    const nftOwners: string[] = []
    nftAuctions.forEach(item => {
      if (item?.auctionManager?.authority) {
        nftOwners.find(address => address === item?.auctionManager?.authority) ||
          nftOwners.push(item.auctionManager.authority)
      }
      if (item.offChainData?.attributes) {
        item.offChainData.attributes.forEach(attribute => {
          if (attribute.trait_type) {
            const attrExist =
              //@ts-ignore
              aT.find(t => t.trait_type.trim() == attribute?.trait_type.trim()) || null
            if (attrExist) {
              if (!attrExist.values.find(text => text === attribute.value)) {
                attrExist.values.push(attribute.value)
              }
            } else {
              aT.push({
                trait_type: attribute?.trait_type || '',
                values: [attribute?.value || ''],
              })
            }
          }
        })
      }
    })
    setOwners(nftOwners)
    setAttributes(aT)
  }, [nftAuctions.length])

  const filterFunction = callBackFun => {
    setNFTItems([])
    setNFTItems(() => (callBackFun(nftAuctions) ? [...callBackFun(nftAuctions)] : []))
  }

  return { nftItems, attributes, filterFunction, count: nftAuctions.length, owners }
}
export default useCollectionNFT

export function useMintD() {
  const connection = useConnection()
  const getMintData = (key: string | PublicKey) => {
    const id = typeof key === 'string' ? key : key?.toBase58()
    return cache.query(connection, id, MintParser)
  }

  return getMintData
}
