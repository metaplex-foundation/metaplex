import React, { FC, useEffect, useState } from 'react'
import { CollectionHeader } from '../../sections/CollectionHeader'
import { CollectionSidebar } from '../../sections/CollectionSidebar'
import { CollectionActionsBar } from '../../sections/CollectionActionsBar'
import { CollectionAppliedFilters } from '../../sections/CollectionAppliedFilters'
import { CollectionNftList } from '../../sections/CollectionNftList'
import { CollectionChart } from '../../sections/CollectionChart'
import { CollectionActivityList } from '../../sections/CollectionActivityList'
import { useParams } from 'react-router-dom'
import {
  useExtendedArt,
  // useExtendedCollection
} from '../../../hooks'
// import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'
// import { LiveAuctionViewState } from '../../../views/home/components/SalesList'
import {
  cache,
  // fromLamports,
  MintParser,
  // PriceFloorType,
  // pubkeyToString,
  useConnection,
  // WRAPPED_SOL_MINT,
} from '@oyster/common'
import { PublicKey } from '@solana/web3.js'
// import { BN } from 'bn.js'
import { useNFTCollections } from '../../../hooks/useCollections'
// import { useAllSplPrices, useSolPrice } from '../../../contexts'
// import { useTokenList } from '../../../contexts/tokenList'
import useCollectionNFT, { NFTItemInterface } from './useCollectionNft'
import { getCollectionHeaderInfo } from '../../../api'

const ATTRIBUTE_FILTERS = 'Attribute'
const RANGE_FILTERS = 'Range'

export interface CollectionProps {}

interface ParamsInterface {
  id: string
}

export interface PriceRangeInterface {
  min: number | null
  max: number | null
}

export interface AppliedFiltersInterface {
  type: string
  text: string
  category: string
  min?: number
  max?: number
}

interface ICollectionHeader {
  collectionName?: string
  creatorPublicKey?: string
  description?: string
  collectionImageURL?: string
  collectionBannerURL?: string
}

export const SORT_LOW_TO_HIGH = 'Low to High'
export const SORT_HIGH_TO_LOW = 'High to Low'

export const Collection: FC<CollectionProps> = () => {
  const [showActivity, setShowActivity] = useState<boolean>(false)
  const [showExplore, setShowExplore] = useState<boolean>(true)
  const [filters, setFilters] = useState<AppliedFiltersInterface[]>([])
  const [searchText, setSearchText] = useState<string>('')
  const [priceRange, setPriceRange] = useState<PriceRangeInterface>({
    min: null,
    max: null,
  })

  const { id }: ParamsInterface = useParams()
  const { nftItems, attributes, filterFunction, count, owners } = useCollectionNFT(id)
  const { liveCollections } = useNFTCollections()

  // const { auctions } = useAuctionsList(LiveAuctionViewState.All)

  const selectedCollection = liveCollections.find(({ mint }) => mint === id) || null

  const pubkey = selectedCollection?.pubkey
  const { data: colData } = useExtendedArt(pubkey)

  const [collectionHeaderData, setCollectionHeaderData] = useState<ICollectionHeader>({
    collectionName: '',
    description: '',
    creatorPublicKey: '',
    collectionImageURL: '',
    collectionBannerURL: '',
  })

  useEffect(() => {
    if (
      colData &&
      colData.properties &&
      colData.properties.creators &&
      colData.properties.creators.length > 0 &&
      colData.collection
    ) {
      const collection = JSON.parse(JSON.stringify(colData.collection))
      getCollectionHeaderInfo(colData?.properties.creators[0].address, collection.name).then(
        data => {
          if (data) {
            setCollectionHeaderData({
              collectionName: data.collection_name,
              description: data.project_description,
              creatorPublicKey: data.creator_public_key,
              collectionImageURL: data.collection_image_url,
              collectionBannerURL: data.collection_banner_url,
            })
          } else {
            setCollectionHeaderData({
              collectionName: collection.name,
              description: colData.description,
              collectionImageURL: colData.image,
              collectionBannerURL: '/img/dummy-collection-cover.png',
            })
          }
        }
      )
    } else {
      setCollectionHeaderData({
        collectionName: colData?.name,
        description: colData?.description,
        collectionImageURL: colData?.image,
        collectionBannerURL: '/img/dummy-collection-cover.png',
      })
    }
  }, [colData])

  // const { getData } = useExtendedCollection()

  // const tokenList = useTokenList()
  // const allSplPrices = useAllSplPrices()

  // const getMintData = useMintD()
  // const solPrice = useSolPrice()

  // useEffect(() => {
  //   if (auctions?.length) {
  //     filteredAuctions(!WITH_FILTER).then(res => {
  //       setCount(res.length)
  //       setAuctionAttr(() => res)
  //     })
  //   }
  // }, [auctions])

  // useEffect(() => {
  //   if (auctions?.length) {
  //     filteredAuctions(WITH_FILTER).then(res => {
  //       setNftItems(() => res)
  //     })
  //   }
  // }, [auctions, filters, searchText])

  useEffect(() => {
    console.log('searchText', searchText)
    filterFunction((items: NFTItemInterface[]) => {
      console.log('items1', items)
      return items.filter(filterFun)
    })
  }, [searchText])

  const shortByPrice = val => {
    const dataArray = [...nftItems].sort(function (a: any, b: any) {
      return val === SORT_LOW_TO_HIGH ? a.amount - b.amount : b.amount - a.amount
    })
    // setNftItems([])
    filterFunction([])
    setTimeout(() => {
      filterFunction(() => [...dataArray])
    }, 1)
  }

  // const filteredAuctions = async (withFilter: boolean) => {
  //   let data = auctions.filter(
  //     auction => auction.thumbnail.metadata.info.collection?.key === pubkeyToString(id)
  //   )

  //   if (!data.length && !pubkey) {
  //     const allItemWithData = await Promise.all(
  //       auctions.map(async auction => {
  //         const gData = await getData(auction.thumbnail.metadata.pubkey)
  //         return { ...gData, _auction: auction }
  //       })
  //     )

  //     data = allItemWithData
  //       .filter(i => {
  //         return i.collection?.name === id
  //       })
  //       .map(({ _auction }) => _auction)
  //   }

  //   const all = await Promise.all(
  //     data.map(async auction => await getData(auction.thumbnail.metadata.pubkey))
  //   )

  //   const allItems = data.map(i => {
  //     const meta = (all || []).find(({ pubkey }) => pubkey === i.thumbnail.metadata.pubkey) || null
  //     return { ...bindAmount(i), meta }
  //   })

  //   if (withFilter) {
  //     return allItems.filter(filterFun)
  //   }
  //   return allItems
  // }

  const filterFun = (auction: any) => {
    // console.log('filters', filters)

    if (!filters.length && !searchText) {
      return true
    }

    // let hasAttr: boolean = false

    // Attribute filter
    // const attrFilters = filters.filter(({ category }) => category === ATTRIBUTE_FILTERS)
    // if (attrFilters.length) {
    //   auction.meta.attributes.forEach(i => {
    //     const a =
    //       filters.filter(
    //         ({ type, text }) =>
    //           type.trim() === i.trait_type.trim() && text.trim() === i.value.trim()
    //       ) || []

    //     if (a.length) {
    //       hasAttr = true
    //     }
    //   })
    // }

    return (
      searchText &&
      auction.offChainData &&
      auction.offChainData.name &&
      auction.offChainData.name.toLowerCase().includes(searchText.toLowerCase())
    )

    // Price Range filter
    // const rangeFilters = filters.find(({ category }) => category === RANGE_FILTERS) || null

    // return (
    //   (rangeFilters &&
    //     rangeFilters &&
    //     (rangeFilters.max || rangeFilters.max === 0) &&
    //     (rangeFilters.min || rangeFilters.min === 0) &&
    //     rangeFilters?.min <= Number(auction.usdAmount) &&
    //     rangeFilters?.max >= Number(auction.usdAmount)) ||
    //   hasAttr ||
    //   (searchText &&
    //     auction.offChainData &&
    //     auction.offChainData.name &&
    //     auction.offChainData.name.toLowerCase().includes(searchText.toLowerCase()))
    // )
  }

  // const bindAmount = auctionView => {
  //   const dx: any = getMintData(auctionView.auction.info.tokenMint)
  //   const participationFixedPrice = auctionView.auctionManager.participationConfig?.fixedPrice || 0
  //   const participationOnly = auctionView.auctionManager.numWinners.eq(new BN(0))
  //   const priceFloor =
  //     auctionView.auction.info.priceFloor.type === PriceFloorType.Minimum
  //       ? auctionView.auction.info.priceFloor.minPrice?.toNumber() || 0
  //       : 0
  //   const amount = fromLamports(participationOnly ? participationFixedPrice : priceFloor, dx.info)

  //   const tokenInfo = tokenList.subscribedTokens.filter(
  //     m => m.address == auctionView.auction.info.tokenMint
  //   )[0]

  //   const altSplPrice = allSplPrices.filter(a => a.tokenMint == tokenInfo?.address)[0]?.tokenPrice
  //   const tokenPrice = tokenInfo?.address == WRAPPED_SOL_MINT.toBase58() ? solPrice : altSplPrice

  //   return { ...auctionView, amount, usdAmount: tokenPrice * amount }
  // }

  const onChangeRange = (data: PriceRangeInterface) => {
    setPriceRange(data)
  }

  const applyRange = () => {
    if (
      (priceRange.max || priceRange.max === 0) &&
      (priceRange.min || priceRange.min === 0) &&
      Number(priceRange.min) <= Number(priceRange.max)
    ) {
      setFilters([
        ...filters.filter(({ type }) => type !== 'RANGE'),
        {
          category: RANGE_FILTERS,
          type: 'RANGE',
          text: `${priceRange.min} - ${priceRange.max}`,
          min: Number(priceRange.min),
          max: Number(priceRange.max),
        },
      ])
    }
  }

  const addAttributeFilters = (data: { attr: string; label: string }) => {
    setFilters([
      ...filters.filter(({ type, text }) => type !== data.attr && text !== data.label),
      { category: ATTRIBUTE_FILTERS, type: data.attr, text: data.label },
    ])
  }

  const removeAppliedAttr = data => {
    setFilters([...filters.filter(({ type, text }) => type !== data.type && text !== data.text)])
  }

  const clearFilters = () => {
    setFilters([])
    setPriceRange({
      max: null,
      min: null,
    })
  }

  return (
    <div className='collection'>
      <CollectionHeader
        isVerified
        avatar={collectionHeaderData.collectionImageURL}
        cover={collectionHeaderData.collectionBannerURL}
        title={collectionHeaderData.collectionName}
        description={
          collectionHeaderData.description && collectionHeaderData.description.length >= 250
            ? `${collectionHeaderData.description?.slice(0, 250)}.....`
            : collectionHeaderData.description
        }
        owners={owners}
        numberOfItems={count}
      />

      <div className='flex w-full pt-[80px] pb-[100px]'>
        <div className='container flex gap-[32px]'>
          <div className='sidebar flex-shrink-0 pr-[16px]'>
            <CollectionSidebar
              applyRange={applyRange}
              range={priceRange}
              setPriceRange={onChangeRange}
              filterAttributes={attributes}
              addAttributeFilters={addAttributeFilters}
            />
          </div>

          <div className='content-wrapper flex w-full flex-col gap-[28px]'>
            <CollectionActionsBar
              onClickActivity={() => {
                setShowExplore(false)
                setShowActivity(true)
              }}
              onClickExplore={() => {
                setShowExplore(true)
                setShowActivity(false)
              }}
              showActivity={showActivity}
              showExplore={showExplore}
              shortByPrice={shortByPrice}
              searchText={searchText}
              onChangeSearchText={e => setSearchText(e.target.value)}
            />

            {showExplore && (
              <div className='flex flex-col gap-[28px]'>
                {!!filters.length && (
                  <CollectionAppliedFilters
                    removeAppliedAttr={removeAppliedAttr}
                    filters={filters}
                    clearFilters={clearFilters}
                  />
                )}
                <CollectionNftList auctions={nftItems} />
              </div>
            )}

            {showActivity && (
              <div className='flex flex-col gap-[28px]'>
                <CollectionChart />
                <CollectionActivityList />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Collection

export function useMintD() {
  const connection = useConnection()
  const getMintData = (key: string | PublicKey) => {
    const id = typeof key === 'string' ? key : key?.toBase58()
    return cache.query(connection, id, MintParser)
  }

  return getMintData
}
