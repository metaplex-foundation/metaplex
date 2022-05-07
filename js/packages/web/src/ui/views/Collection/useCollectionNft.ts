import { IMetadataExtension, pubkeyToString } from '@oyster/common'
import { useEffect, useState } from 'react'
import { AuctionView, useExtendedCollection } from '../../../hooks'
import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'
import { LiveAuctionViewState } from '../Home'

export interface NFTItemInterface extends AuctionView {
  offChainData: IMetadataExtension
}

export interface Attribute {
  trait_type: string
  values: Array<any>
}

const useCollectionNFT = (id: string) => {
  const { auctions } = useAuctionsList(LiveAuctionViewState.All)
  const { getData } = useExtendedCollection()
  const [nftItems, setNFTItems] = useState<NFTItemInterface[]>([])
  const [attributes, setAttributes] = useState<Attribute[]>([])

  useEffect(() => {
    if (auctions) {
      const itemsArray: NFTItemInterface[] = []
      auctions
        .filter(auction => {
          return auction.thumbnail.metadata.info.collection?.key === pubkeyToString(id)
        })
        .forEach(auction => {
          getData(auction.thumbnail.metadata.pubkey).then(res => {
            itemsArray.push({ ...auction, offChainData: res })
          })
        })
      setNFTItems(itemsArray)
    }
  }, [auctions.length])

  useEffect(() => {
    const aT: Attribute[] = []
    nftItems.forEach(item => {
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
    setAttributes(aT)
  }, [nftItems.length])

  return { nftItems, attributes }
}
export default useCollectionNFT
