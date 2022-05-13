import React, { FC } from 'react'
import CN from 'classnames'
import { AttributesCard, Image, Tag, Button, SOLIcon } from '@oyster/common'
import { AuctionView, useBidsForAuction, useCreators, useExtendedArt, useArt } from '../../../hooks'
import useNFTData from '../../../hooks/useNFTData'
import { AuctionCard } from '../../../components/AuctionCard'
import { useCollections } from '../../../hooks/useCollections'
import useAttribute from '../../../hooks/useAttribute'

export interface QuickBuyProps {
  auction: AuctionView
}

const dummyAttributes = [
  {
    overline: 'Clothing',
    value: 'Cheerleader',
    tag: '44.14%',
  },
  {
    overline: 'Generation',
    value: '1',
    tag: '44.14%',
  },
  {
    overline: 'Head',
    value: "Musketeer's Hat",
    tag: '44.14%',
  },
  {
    overline: 'Clothing',
    value: 'Cheerleader',
    tag: '44.14%',
  },
  {
    overline: 'Generation',
    value: '1',
    tag: '44.14%',
  },
  {
    overline: 'Head',
    value: "Musketeer's Hat",
    tag: '44.14%',
  },
]

export const QuickBuy: FC<QuickBuyProps> = ({ auction }: QuickBuyProps) => {
  const QuickBuyClasses = CN(`quick-buy flex flex-col gap-[32px]`)
  const { data } = useExtendedArt(auction?.thumbnail.metadata.pubkey)
  const {
    value: { solVal, usdValFormatted },
  } = useNFTData(auction)
  const url = data?.image
  const { liveCollections } = useCollections()
  const pubkey = liveCollections.find(({ mint }) => mint === data?.collection)?.pubkey || undefined
  const { data: collection } = useExtendedArt(pubkey)
  const { attributesPercentages } = useAttribute(auction)
  const art = useArt(auction.thumbnail.metadata.pubkey)

  console.log('auction', auction)
  console.log('Quick Buy', data)

  return (
    <div className={QuickBuyClasses} /*{...restProps}*/>
      <div className='flex gap-[32px]'>
        <span className='h-[320px] w-[320px] overflow-hidden rounded-[8px]'>
          <Image src={url} />
        </span>

        <div className='flex flex-col gap-[28px]'>
          <div className='flex flex-col gap-[20px]'>
            <div className='flex flex-col gap-[4px]'>
              <h2 className='text-h2 font-500 text-slate-800'>{data?.name ?? ''}</h2>
              <div className='flex items-center gap-[4px]'>
                <h6 className='text-h6 font-500'>
                  {' '}
                  {
                    //@ts-ignore
                    collection?.name ?? data?.collection?.name
                  }
                </h6>
                <i className='ri-checkbox-circle-fill text-[24px] text-green-400' />
              </div>

              <div className='flex items-center gap-[8px]'>
                <span className='text-md font-500'>Royalties</span>
                <Tag>{((art.seller_fee_basis_points || 0) / 100).toFixed(2)}%</Tag>
              </div>
            </div>
          </div>

          <div className='flex flex-col gap-[8px]'>
            <h5 className='text-h6 font-500'>Current price</h5>
            <div className='flex items-center gap-[8px]'>
              <SOLIcon size={24} />
              <h4 className='text-h4 font-600 leading-[1]'>{solVal ?? ''} SOL</h4>
              <span className='ml-[4px] text-lg text-slate-500'>{usdValFormatted ?? ''}</span>
            </div>
          </div>
          {auction && <AuctionCard auctionView={auction} hideDefaultAction={false} />}
          {/* <div className='flex items-center gap-[16px]'>
            <Button size='lg' className='w-[230px]'>
              Buy Now
            </Button>
          </div> */}
        </div>
      </div>

      {/* <div className='flex flex-col gap-[20px]'>
        <h5 className='text-h5'>Attributes</h5>
        <div className='grid grid-cols-3 gap-[8px]'>
          {(data?.attributes || []).map(({ trait_type: label, value }: any, index: number) => {
            const tagVal =
              attributesPercentages.find(p => p.trait_type === label && p.value === value) || null
            return (
              <AttributesCard
                key={`${index}-${label}`}
                overline={label}
                label={value}
                tag={tagVal ? `🔥 ${tagVal?.percentage.toFixed(2)}%` : ''}
                hasHoverEffect={false}
                className='cursor-auto !py-[12px] !px-[16px]'
              />
            )
          })}
        </div>
      </div> */}
    </div>
  )
}

QuickBuy.defaultProps = {}

export default QuickBuy
