import React, { FC, useEffect, useState } from 'react'
import { CollectionHeader } from '../../sections/CollectionHeader'
import { CollectionSidebar } from '../../sections/CollectionSidebar'
import { CollectionActionsBar } from '../../sections/CollectionActionsBar'
import { CollectionAppliedFilters } from '../../sections/CollectionAppliedFilters'
import { AhCollectionNftList, CollectionNftList } from '../../sections/CollectionNftList'
import { CollectionChart } from '../../sections/CollectionChart'
import { CollectionActivityList } from '../../sections/CollectionActivityList'
import { getCollectionStatistics, getCollectionVolumn } from '../../../api'
import { useParams } from 'react-router-dom'
import {
  useAhExtendedArt,
  useArt,
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
import { getAllListingsByCollection } from '../../../api/ahListingApi'
import { AnyMxRecord } from 'dns'

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
  volumn?: string
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

  const [collectionStates, setCollectionStates] = useState<any>(null)
  const [collectionVolumn, setCollectionVolumn] = useState<any>('')

  const { id }: ParamsInterface = useParams()
  const { nftItems, attributes, filterFunction } = useCollectionNFT(id)
  const [owners, setOwners] = useState<any>()
  const [count, setCount] = useState(0)
  const [floorPrice, setfloorPrice] = useState(0.0)
  const [colData, setData] = useState<any>()
  const [nftListings, setnftListings] = useState()
  const [filteredNftListings, setfilteredNftListings] = useState()

  const [collectionHeaderData, setCollectionHeaderData] = useState<ICollectionHeader>({
    collectionName: '',
    description: '',
    creatorPublicKey: '',
    collectionImageURL: '',
    collectionBannerURL: '',
  })

  useEffect(() => {
    const processJson = (extended: any, uri: string) => {
      if (!extended || extended?.properties?.files?.length === 0) {
        return
      }

      if (extended?.image) {
        const file = extended.image.startsWith('http') ? extended.image : `${uri}/${extended.image}`
        extended.image = file
      }

      return extended
    }

    const getUniqueOwnersCount = (listings: any[]) => {
      const uniqueOwnerIds = listings
        .map(item => item.seller_wallet)
        .filter((value, index, self) => self.indexOf(value) === index)

      return uniqueOwnerIds
    }

    const findFloorPrice = (listings: any[]) => {
      var res = listings.reduce(function (prev, current) {
        return prev.sale_price < current.sale_price ? prev : current
      })
      return res
    }

    const fetchData = async () => {
      const listings = await getAllListingsByCollection(id)
      if (!!listings) {
        setnftListings(listings)
        setfilteredNftListings(listings)
        setCount(listings.length)
        setOwners(getUniqueOwnersCount(listings))
        setfloorPrice(findFloorPrice(listings).sale_price)
        const uri = (listings[0] as any).metadata.info.data.uri
        fetch(uri)
          .then(async _ => {
            try {
              const data = await _.json()
              try {
                localStorage.setItem(uri, JSON.stringify(data))
              } catch {
                // ignore
              }
              setData(processJson(data, uri))
            } catch {
              return undefined
            }
          })
          .catch(() => {
            return undefined
          })
      }
    }
    fetchData().catch(console.error)
  }, [id])

  useEffect(() => {
    console.log('colData', colData)
    if (colData) {
      getCollectionHeaderInfo(
        colData?.properties.creators[0].address,
        colData.collection.name
      ).then(data => {
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
            collectionName: colData.collection.name,
            description: colData.description,
            collectionImageURL: colData.image,
          })
        }
      })
    } else {
      setCollectionHeaderData({
        collectionName: colData?.collection.name,
        description: colData?.collection.description,
        collectionImageURL: colData?.collection.image,
      })
    }
  }, [colData])

  useEffect(() => {
    if (!!nftListings) {
      setfilteredNftListings(
        (nftListings as any[]).filter(elem => {
          return elem.nft_name.includes(searchText)
        }) as any
      )
    }
  }, [searchText, filters])

  useEffect(() => {
    const collectionId = id
    if (collectionId) {
      getCollectionStatistics(collectionId).then(data => {
        setCollectionStates(data)
      })
    }
  }, [])

  useEffect(() => {
    const collectionId = id
    if (collectionId) {
      getCollectionVolumn(collectionId).then(data => {
        setCollectionVolumn(abbrNum(data.nftTotalSales.total_usd, 4))
      })
    }
  }, [])

  const sortByPrice = val => {
    //@ts-ignore
    const dataArray = [...filteredNftListings].sort(function (a: any, b: any) {
      return val === SORT_LOW_TO_HIGH ? a.sale_price - b.sale_price : b.sale_price - a.sale_price
    })
    //@ts-ignore
    setfilteredNftListings(dataArray)
  }

  const filterFun = (sale: any) => {
    if (!filters.length && !searchText) {
      return true
    }

    let hasAttr: boolean = false

    // Attribute filter
    const attrFilters = filters.filter(({ category }) => category === ATTRIBUTE_FILTERS)
    if (attrFilters.length) {
      sale.attributes.forEach(i => {
        const a =
          filters.filter(
            ({ type, text }) =>
              type.trim() === i.trait_type.trim() && text.trim() === i.value.trim()
          ) || []

        if (a.length) {
          hasAttr = true
        }
      })
    }

    return (
      (searchText &&
        sale.extendedData &&
        sale.extendedData.name &&
        sale.extendedData.name.toLowerCase().includes(searchText.toLowerCase())) ||
      hasAttr
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

  const abbrNum = (number: any, decPlaces: any) => {
    let orig = number
    let dec = decPlaces
    // 2 decimal places => 100, 3 => 1000, etc
    decPlaces = Math.pow(10, decPlaces)

    // Enumerate number abbreviations
    let abbrev = ['k', 'm', 'b', 't']

    // Go through the array backwards, so we do the largest first
    for (let i = abbrev.length - 1; i >= 0; i--) {
      // Convert array index to "1000", "1000000", etc
      let size = Math.pow(10, (i + 1) * 3)

      // If the number is bigger or equal do the abbreviation
      if (size <= number) {
        // Here, we multiply by decPlaces, round, and then divide by decPlaces.
        // This gives us nice rounding to a particular decimal place.
        number = Math.round((number * decPlaces) / size) / decPlaces

        // Handle special case where we round up to the next abbreviation
        if (number == 1000 && i < abbrev.length - 1) {
          number = 1
          i++
        }

        // console.log(number);
        // Add the letter for the abbreviation
        number += abbrev[i]

        // We are done... stop
        break
      }
    }

    console.log('abbrNum(' + orig + ', ' + dec + ') = ' + number)
    return number
  }

  return (
    <div className='collection'>
      <CollectionHeader
        floorPrice={floorPrice}
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
        volumn={collectionVolumn}
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
              sortByPrice={sortByPrice}
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
                <AhCollectionNftList listings={filteredNftListings} />
              </div>
            )}

            {showActivity && (
              <div className='flex flex-col gap-[28px]'>
                <CollectionChart data={collectionStates} />
                <CollectionActivityList data={collectionStates} />
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
