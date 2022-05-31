import React, { FC, useEffect, useState } from 'react'
import CN from 'classnames'
import { AuctionView } from '../../../hooks'
import { getOffersRecords, getListingRecords, getSalesRecords } from '../../../api'
import moment from 'moment'

export interface NFTDetailsActivityProps {
  [x: string]: any
  auction: AuctionView
}

export const NFTDetailsActivity: FC<NFTDetailsActivityProps> = ({
  className,
  ...restProps
}: NFTDetailsActivityProps) => {
  const NFTDetailsActivityClasses = CN(`nft-details-activity w-full`, className)
  const [activity, setActivity] = useState<Array<any>>([])
  const [offers, setOffers] = useState([])
  const [sr, setSR] = useState([])
  const [listings, setListings] = useState([])

  const mintKey = restProps.auction.thumbnail.metadata.info.mint

  useEffect(() => {
    getListingRecords(mintKey).then(li => {
      setListings(
        li.data.map(data => {
          return { ...data, type: 'Listing' }
        })
      )
    })

    getOffersRecords(mintKey).then(of => {
      setOffers(
        of.data.map(data => {
          return { ...data, type: 'Offers' }
        })
      )
    })

    getSalesRecords(mintKey).then(sr => {
      setSR(
        sr.data.map(data => {
          return { ...data, type: 'Sales' }
        })
      )
    })
  }, [mintKey])

  useEffect(() => {
    const contactArray = shortByDate(offers.concat(listings).concat(sr), 'createdAt')

    setActivity([
      ...contactArray.map(i => {
        return {
          type: i.type,
          from: i.seller_wallet ? getFormattedAddress(i.seller_wallet) : '',
          to: i.buyer_wallet ? getFormattedAddress(i.buyer_wallet) : '',
          time: moment(i.createdAt).fromNow(),
          price: i.type === 'Offers' ? i.offer_price : i.tnx_sol_amount,
        }
      }),
    ])
  }, [offers, sr, listings])

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

NFTDetailsActivity.defaultProps = {}

export default NFTDetailsActivity
