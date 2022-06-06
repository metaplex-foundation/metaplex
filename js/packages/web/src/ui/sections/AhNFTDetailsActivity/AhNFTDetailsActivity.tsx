import React, { FC, useEffect, useState } from 'react'
import CN from 'classnames'
import { AuctionView } from '../../../hooks'
import { getOffersRecords, getListingRecords, getSalesRecords } from '../../../api'
import moment from 'moment'
import { getAllActivitiesForNFT } from '../../../api/ahListingApi'
import { useParams } from 'react-router-dom'

export interface AhNFTDetailsActivityProps {
  [x: string]: any
  sale: any
}

export const AhNFTDetailsActivity: FC<any> = ({
  sale,
  className,
  ...restProps
}: AhNFTDetailsActivityProps) => {
  const NFTDetailsActivityClasses = CN(`nft-details-activity w-full`, className)
  const [activity, setActivity] = useState<Array<any>>([])

  useEffect(() => {
    const fetchData = async () => {
      const sale_ = await getAllActivitiesForNFT(sale.mint)
      if (!!sale_) {
        if (Array.isArray(sale_)) {
          setActivity([
            ...sale_.map(i => {
              return {
                type: i.active === false ? 'Sold' : 'Offer made',
                from: i.seller_wallet ? getFormattedAddress(i.seller_wallet) : '',
                to: i.ah_nft_offer.buyer_wallet
                  ? getFormattedAddress(i.ah_nft_offer.buyer_wallet)
                  : '',
                time: moment(i.createdAt).fromNow(),
                price: i.ah_nft_offer.offer_price,
              }
            }),
          ])
        }
      } else {
        setActivity([
          {
            type: sale_.active === false ? 'Sold' : 'Offer made',
            from: sale_.seller_wallet ? getFormattedAddress(sale_.seller_wallet) : '',
            to: sale_.ah_nft_offer.buyer_wallet
              ? getFormattedAddress(sale_.ah_nft_offer.buyer_wallet)
              : '',
            time: moment(sale_.createdAt).fromNow(),
            price: sale_.ah_nft_offer.offer_price,
          } as any,
        ])
      }
    }
    fetchData().catch(console.error)
  }, [sale])

  const getFormattedAddress = address =>
    `${address?.substring(0, 3)}...${address?.substring(address.length - 4)}`

  const shortByDate = (itemsArray, dateKey) => {
    return itemsArray.sort((a, b) => {
      return moment(a[dateKey]).isBefore(b[dateKey])
        ? 1
        : moment(b[dateKey]).isBefore(a[dateKey])
        ? -1
        : 0
    })
  }

  return (
    <div className={NFTDetailsActivityClasses} {...restProps}>
      <div className='mb-[4px] grid grid-cols-5 px-[8px] pb-[8px] text-md font-500 text-slate-500'>
        <div className='grid-cell'>Type</div>
        <div className='grid-cell'>Price</div>
        <div className='grid-cell'>From</div>
        <div className='grid-cell'>To</div>
        <div className='grid-cell'>Time</div>
      </div>

      <div className='flex flex-col gap-[4px]'>
        {activity.map(({ type, from, to, time, price }: any, index: number) => (
          <div
            className='grid grid-cols-5 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md font-400 text-slate-800 shadow-card'
            key={index}>
            <div className='grid-cell'>{type}</div>
            <div className='grid-cell'>{price}</div>
            <div className='grid-cell'>{from}</div>
            <div className='grid-cell'>{to}</div>
            <div className='grid-cell'>{time}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

AhNFTDetailsActivity.defaultProps = {}

export default AhNFTDetailsActivity
