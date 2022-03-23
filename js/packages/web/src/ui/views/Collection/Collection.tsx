import React, { FC, useMemo, useState } from 'react'
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
import { pubkeyToString } from '@oyster/common'

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
  console.log('auctions', auctions)

  const filteredAuctions = useMemo(() => {
    return auctions
    if (pubkey) {
      return auctions.filter(
        auction => auction.thumbnail.metadata.info.collection?.key === pubkeyToString(pubkey)
      )
    }
    return auctions
  }, [auctions, pubkey])

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
            />

            {showExplore && (
              <div className='flex flex-col gap-[28px]'>
                {!!filters.length && (
                  <CollectionAppliedFilters filters={filters} clearFilters={clearFilters} />
                )}
                <CollectionNftList auctions={filteredAuctions} />
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
