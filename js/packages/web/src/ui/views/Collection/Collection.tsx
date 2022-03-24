import React, { FC, useEffect, useState } from 'react'
import { CollectionHeader } from '../../sections/CollectionHeader'
import { CollectionSidebar } from '../../sections/CollectionSidebar'
import { CollectionActionsBar } from '../../sections/CollectionActionsBar'
import { CollectionAppliedFilters } from '../../sections/CollectionAppliedFilters'
import { CollectionNftList } from '../../sections/CollectionNftList'
import { CollectionChart } from '../../sections/CollectionChart'
import { CollectionActivityList } from '../../sections/CollectionActivityList'
import { useParams } from 'react-router-dom'
import { useExtendedArt } from '../../../hooks'
import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'
import { LiveAuctionViewState } from '../../../views/home/components/SalesList'
import {
  cache,
  fromLamports,
  MintParser,
  PriceFloorType,
  pubkeyToString,
  useConnection,
} from '@oyster/common'
import { PublicKey } from '@solana/web3.js'
import { BN } from 'bn.js'

export interface CollectionProps {}

interface ParamsInterface {
  pubkey: string
}

export interface PriceRangeInterface {
  min: number | null
  max: number | null
}

export interface AppliedFiltersInterface {
  type: string
  text: string
}

export const SORT_LOW_TO_HIGH = 'Low to High'
export const SORT_HIGH_TO_LOW = 'High to Low'

export const Collection: FC<CollectionProps> = () => {
  const [showActivity, setShowActivity] = useState<boolean>(false)
  const [showExplore, setShowExplore] = useState<boolean>(true)
  const { pubkey }: ParamsInterface = useParams()
  const { data } = useExtendedArt(pubkey)
  const { auctions } = useAuctionsList(LiveAuctionViewState.All)
  const [filters, setFilters] = useState<AppliedFiltersInterface[]>([])
  const [priceRange, setPriceRange] = useState<PriceRangeInterface>({
    min: null,
    max: null,
  })
  const [nftItems, setNftItems] = useState<any[]>([])

  console.log('auctions', auctions)

  const getMintData = useMintD()

  useEffect(() => {
    if (auctions?.length) {
      setNftItems(() => filteredAuctions().map(bindAmount))
    }
  }, [auctions])

  const shortByPrice = val => {
    const dataArray = [...nftItems].sort(function (a: any, b: any) {
      return val === SORT_LOW_TO_HIGH ? a.amount - b.amount : b.amount - a.amount
    })
    setNftItems([])
    setTimeout(() => {
      setNftItems(() => [...dataArray])
    }, 1)
  }

  const filteredAuctions = () => {
    // return auctions
    if (pubkey) {
      return auctions.filter(
        auction => auction.thumbnail.metadata.info.collection?.key === pubkeyToString(pubkey)
      )
    }
    return auctions
  }

  const bindAmount = auctionView => {
    const dx: any = getMintData(auctionView.auction.info.tokenMint)
    const participationFixedPrice = auctionView.auctionManager.participationConfig?.fixedPrice || 0
    const participationOnly = auctionView.auctionManager.numWinners.eq(new BN(0))
    const priceFloor =
      auctionView.auction.info.priceFloor.type === PriceFloorType.Minimum
        ? auctionView.auction.info.priceFloor.minPrice?.toNumber() || 0
        : 0
    const amount = fromLamports(participationOnly ? participationFixedPrice : priceFloor, dx.info)

    return { ...auctionView, amount }
  }

  const onChangeRange = (data: PriceRangeInterface) => {
    setPriceRange(data)
  }

  const applyRange = () => {
    if (priceRange.max && priceRange.min) {
      setFilters([
        ...filters.filter(({ type }) => type !== 'RANGE'),
        { type: 'RANGE', text: `${priceRange.min} - ${priceRange.max}` },
      ])
    }
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
        avatar={data?.image ?? ''}
        cover='/img/dummy-collection-cover.png'
        title={data?.name ?? ''}
        description={data?.description ?? ''}
      />

      <div className='flex w-full pt-[80px] pb-[100px]'>
        <div className='container flex gap-[32px]'>
          <div className='sidebar flex-shrink-0 pr-[16px]'>
            <CollectionSidebar
              applyRange={applyRange}
              range={priceRange}
              setPriceRange={onChangeRange}
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
            />

            {showExplore && (
              <div className='flex flex-col gap-[28px]'>
                {!!filters.length && (
                  <CollectionAppliedFilters filters={filters} clearFilters={clearFilters} />
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
