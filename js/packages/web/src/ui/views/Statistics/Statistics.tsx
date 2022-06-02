import React, { FC, useEffect, useState } from 'react'
import CN from 'classnames'
import { SectionHeading, CollectionCard, MetaChip } from '@oyster/common'
import { getTotalStatistics } from '../../../api'

export interface StatisticsProps {
  [x: string]: any
}

export const Statistics: FC<StatisticsProps> = ({ className, ...restProps }: StatisticsProps) => {
  const StatisticsClasses = CN(`statistics`, className)

  const [statistics, setStatistics] = useState<any>(null)

  useEffect(() => {

    getTotalStatistics().then((data) => {
      setStatistics(data)
    })

  }, [])

  return (
    <div className={StatisticsClasses} {...restProps}>
      <div className='container flex flex-col gap-[60px] pt-[80px] pb-[100px]'>
        <SectionHeading
          commonClassName='!flex items-center !justify-center !text-center w-full'
          headingClassName='text-display-md'
          heading='Top NFT Collections'
          description='The top NFTs on Karmaplex, ranked by volume, floor price and other statistics.'
          descriptionClassName='text-slate-800'
        />

        <div className='stats-card mx-auto flex h-[100px] w-full max-w-[728px] items-center justify-between gap-[32px] rounded bg-white p-[20px] shadow-card'>
          <MetaChip className='w-full' align='center' description='Collections' heading={statistics !== null ? statistics.statBar.collection: ""} />
          <span className='flex h-[60px] w-[1px] bg-slate-200' />
          <MetaChip className='w-full' align='center' description='Owners' heading={statistics !== null ? statistics.statBar.owners: "" } />
          <span className='flex h-[60px] w-[1px] bg-slate-200' />
          <MetaChip className='w-full' align='center' description='Categories' heading={statistics !== null ? statistics.statBar.categories: "" } />
          <span className='flex h-[60px] w-[1px] bg-slate-200' />
          <MetaChip className='w-full' align='center' description='Volume' heading={statistics !== null ? "$"+statistics.statBar.categories: "" } />
        </div>
      </div>

      <div className='container pb-[100px]'>
        <div className='grid grid-cols-[0.25fr_2fr_1fr_1fr_1fr_1fr] pl-[20px]'>
          <p className='text-md font-500 text-B-400'>#</p>
          <p className='text-md font-500 text-B-400'>Collection</p>
          <p className='text-md font-500 text-B-400'>Market cap</p>
          <p className='text-md font-500 text-B-400'>7d Volume</p>
          <p className='text-md font-500 text-B-400'>Avg. price (24hrs)</p>
          <p className='text-md font-500 text-B-400'>Floor price</p>
        </div>
        {statistics !== null ? 
          <ul className='flex flex-col gap-[12px] pt-[20px]'>
            
              {(statistics.nftStates || []).map(
                (
                  { id, rank, NFTName, itemCount, image, marketCap, volume, avgPrice, floorPrice },
                  index
                ) => (
                  <li key={id || index}>
                    <CollectionCard
                      rank={rank}
                      NFTName={NFTName}
                      itemCount={itemCount}
                      image={image}
                      marketCap={marketCap}
                      volume={volume}
                      avgPrice={avgPrice}
                      floorPrice={floorPrice}
                    />
                  </li>
                )
              )}
          </ul>
        : ""
        }
      </div>
    </div>
  )
}

const dummyData = [
  {
    id: 0,
    rank: '# 1',
    NFTName: 'Degenerate Ape Academy',
    itemCount: '10,000',
    image: '/img/temp/nft12.webp',
    marketCap: {
      amount: '574,000',
      dollarValue: '$28,384,300.00',
    },
    volume: {
      volumeAmount: '235',
      volumePercentage: '+543.10%',
      isPositive: true,
    },
    avgPrice: {
      avgSolAmount: '0.00',
      history: '$0.00',
    },

    floorPrice: {
      floorSolAmount: '57.40',
      floorDollarAmount: '$2838.43',
    },
  },
  {
    id: 1,
    rank: '# 2',
    NFTName: 'Degenerate Ape Academy',
    itemCount: '10,000',
    image: '/img/temp/nft12.webp',
    marketCap: {
      amount: '574,000',
      dollarValue: '$28,384,300.00',
    },
    volume: {
      volumeAmount: '235',
      volumePercentage: '+543.10%',
      isPositive: true,
    },
    avgPrice: {
      avgSolAmount: '0.00',
      history: '$0.00',
    },

    floorPrice: {
      floorSolAmount: '57.40',
      floorDollarAmount: '$2838.43',
    },
  },
  {
    id: 2,
    rank: '# 3',
    NFTName: 'Degenerate Ape Academy',
    itemCount: '10,000',
    image: '/img/temp/nft12.webp',
    marketCap: {
      amount: '574,000',
      dollarValue: '$28,384,300.00',
    },
    volume: {
      volumeAmount: '235',
      volumePercentage: '-302.50%',
      isPositive: false,
    },
    avgPrice: {
      avgSolAmount: '0.00',
      history: '$0.00',
    },

    floorPrice: {
      floorSolAmount: '57.40',
      floorDollarAmount: '$2838.43',
    },
  },
  {
    id: 3,
    rank: '# 4',
    NFTName: 'Degenerate Ape Academy',
    itemCount: '10,000',
    image: '/img/temp/nft12.webp',
    marketCap: {
      amount: '574,000',
      dollarValue: '$28,384,300.00',
    },
    volume: {
      volumeAmount: '235',
      volumePercentage: '-302.50%',
      isPositive: false,
    },
    avgPrice: {
      avgSolAmount: '0.00',
      history: '$0.00',
    },

    floorPrice: {
      floorSolAmount: '57.40',
      floorDollarAmount: '$2838.43',
    },
  },
  {
    id: 4,
    rank: '# 5',
    NFTName: 'Degenerate Ape Academy',
    itemCount: '10,000',
    image: '/img/temp/nft12.webp',
    marketCap: {
      amount: '574,000',
      dollarValue: '$28,384,300.00',
    },
    volume: {
      volumeAmount: '235',
      volumePercentage: '-302.50%',
      isPositive: false,
    },
    avgPrice: {
      avgSolAmount: '0.00',
      history: '$0.00',
    },

    floorPrice: {
      floorSolAmount: '57.40',
      floorDollarAmount: '$2838.43',
    },
  },
  {
    id: 5,
    rank: '# 6',
    NFTName: 'Degenerate Ape Academy',
    itemCount: '10,000',
    image: '/img/temp/nft12.webp',
    marketCap: {
      amount: '574,000',
      dollarValue: '$28,384,300.00',
    },
    volume: {
      volumeAmount: '235',
      volumePercentage: '-302.50%',
      isPositive: false,
    },
    avgPrice: {
      avgSolAmount: '0.00',
      history: '$0.00',
    },

    floorPrice: {
      floorSolAmount: '57.40',
      floorDollarAmount: '$2838.43',
    },
  },
  {
    id: 6,
    rank: '# 7',
    NFTName: 'Degenerate Ape Academy',
    itemCount: '10,000',
    image: '/img/temp/nft12.webp',
    marketCap: {
      amount: '574,000',
      dollarValue: '$28,384,300.00',
    },
    volume: {
      volumeAmount: '235',
      volumePercentage: '-302.50%',
      isPositive: false,
    },
    avgPrice: {
      avgSolAmount: '0.00',
      history: '$0.00',
    },

    floorPrice: {
      floorSolAmount: '57.40',
      floorDollarAmount: '$2838.43',
    },
  },
  {
    id: 7,
    rank: '# 8',
    NFTName: 'Degenerate Ape Academy',
    itemCount: '10,000',
    image: '/img/temp/nft12.webp',
    marketCap: {
      amount: '574,000',
      dollarValue: '$28,384,300.00',
    },
    volume: {
      volumeAmount: '235',
      volumePercentage: '-302.50%',
      isPositive: false,
    },
    avgPrice: {
      avgSolAmount: '0.00',
      history: '$0.00',
    },

    floorPrice: {
      floorSolAmount: '57.40',
      floorDollarAmount: '$2838.43',
    },
  },
  {
    id: 8,
    rank: '# 9',
    NFTName: 'Degenerate Ape Academy',
    itemCount: '10,000',
    image: '/img/temp/nft12.webp',
    marketCap: {
      amount: '574,000',
      dollarValue: '$28,384,300.00',
    },
    volume: {
      volumeAmount: '235',
      volumePercentage: '-302.50%',
      isPositive: false,
    },
    avgPrice: {
      avgSolAmount: '0.00',
      history: '$0.00',
    },

    floorPrice: {
      floorSolAmount: '57.40',
      floorDollarAmount: '$2838.43',
    },
  },
  {
    id: 9,
    rank: '# 10',
    NFTName: 'Degenerate Ape Academy',
    itemCount: '10,000',
    image: '/img/temp/nft12.webp',
    marketCap: {
      amount: '574,000',
      dollarValue: '$28,384,300.00',
    },
    volume: {
      volumeAmount: '235',
      volumePercentage: '-302.50%',
      isPositive: false,
    },
    avgPrice: {
      avgSolAmount: '0.00',
      history: '$0.00',
    },

    floorPrice: {
      floorSolAmount: '57.40',
      floorDollarAmount: '$2838.43',
    },
  },
]

export default Statistics
