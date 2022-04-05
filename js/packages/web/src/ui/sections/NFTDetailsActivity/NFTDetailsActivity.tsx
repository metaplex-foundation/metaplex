import React, { FC, useEffect, useState } from 'react'
import CN from 'classnames'
import { AuctionView } from '../../../hooks'
import { getSalesRecords } from '../../../api'
import moment from 'moment'

export interface NFTDetailsActivityProps {
  [x: string]: any,
  auction: AuctionView,
}

export const NFTDetailsActivity: FC<NFTDetailsActivityProps> = ({
  className,
  ...restProps
}: NFTDetailsActivityProps) => {
  const NFTDetailsActivityClasses = CN(`nft-details-activity w-full`, className)
  const [ activity, setActivity ] = useState([])

  useEffect(() => {
    const mintKey = restProps.auction.auction.pubkey;
    const fetchSalesRecords = async () => {
      const sales = await getSalesRecords(mintKey)
      
      sales.data.forEach((record) => {
        record.type = record.tnx_type
        record.price = record.tnx_sol_amount
        record.from = `${record.from_address.substring(0,3)}...${record.from_address.substring(record.from_address.length - 4)}`
        record.to = `${record.to_address.substring(0,3)}...${record.to_address.substring(record.to_address.length - 4)}`
        record.time = moment(record.datetime).startOf('hour').fromNow()
      })
      setActivity(sales.data)
    }

    fetchSalesRecords()
  }, [])

  return (
    <div className={NFTDetailsActivityClasses} {...restProps}>
      <div className='grid grid-cols-5 px-[8px] pb-[8px] text-md font-500 text-slate-500 mb-[4px]'>
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
