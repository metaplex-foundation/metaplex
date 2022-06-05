import React, { FC, useEffect, useState } from 'react'
import { InputNumber, Spin } from 'antd'
import CN from 'classnames'
import { SOLIcon, Avatar, formatTokenAmount, Button, useConnection, notify } from '@oyster/common'
import { AuctionView, useBidsForAuction } from '../../../hooks'
import useNFTData from '../../../hooks/useNFTData'
import { getAuctionHouseNFByMint } from '../../../api/ahOffersApi'
import { useWallet } from '@solana/wallet-adapter-react'
import { listAuctionHouseNFT } from '../../../actions/AuctionHouse'

export interface NFTDetailsCurrentOffersProps {
  [x: string]: any
  sale: any
}

export const AhNFTDetailsCurrentOffers: FC<NFTDetailsCurrentOffersProps> = ({
  className,
  ...restProps
}: NFTDetailsCurrentOffersProps) => {
  const NFTDetailsCurrentOffersClasses = CN(`nft-details-current-offers w-full`, className)
  // const bids = useBidsForAuction(restProps.auction.auction.pubkey || '')
  const [offers, setOffers] = useState<any>([])
  const wallet = useWallet()
  const connection = useConnection()
  const [loading, setLoading] = useState<boolean>(false)
  const [refresh, setRefresh] = useState(false)
  useEffect(() => {
    const fetchData = async () => {
      const offers: any[] = await getAuctionHouseNFByMint(restProps.sale?.mint)

      if (!!offers) {
        const activeOffers = offers.filter((elem: any) => {
          return elem.active == true
        })
        setOffers(activeOffers)
        console.log(activeOffers)
      }
    }
    fetchData().catch(console.error)
  }, [restProps.sale.mint])

  return (
    <div className={NFTDetailsCurrentOffersClasses} {...restProps}>
      <div className='mb-[4px] grid grid-cols-[1fr_1fr_1fr_1fr_0.5fr] px-[8px] pb-[8px] text-md font-500 text-slate-500'>
        <div className='grid-cell'>From</div>
        <div className='grid-cell'>Price</div>
        <div className='grid-cell'>Floor difference</div>
        <div className='grid-cell flex items-center'>Action</div>
      </div>

      <div className='flex flex-col gap-[4px]'>
        {(offers || []).map((offer, index) => (
          <div
            className='grid grid-cols-[1fr_1fr_1fr_1fr_0.5fr] items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md font-400 text-slate-800 shadow-card'
            key={index}>
            <div className='grid-cell'>
              <Avatar
                size='sm'
                image=''
                label={`${offer?.buyer_wallet?.substring(0, 3)}...${offer?.buyer_wallet.substring(
                  offer?.buyer_wallet.length - 4
                )}`}
                labelClassName='font-400'
              />
            </div>

            <div className='grid-cell'>
              <span className='flex items-center gap-[4px]'>
                <SOLIcon size={12} />
                <span>{offer?.offer_price}</span>
              </span>
            </div>

            {/* <div className='grid-cell'>
                <span className='flex items-center gap-[4px]'>
                  <span></span>

                  {floorDifferenceType === 'above' ? (
                    <i className='ri-arrow-up-line text-[16px] font-400' />
                  ) : (
                    <i className='ri-arrow-down-line text-[16px] font-400' />
                  )}
                </span>
              </div> */}
            <div className='grid-cell'>
              <span className='flex items-center gap-[4px]'>0</span>
            </div>

            <div className='grid-cell flex items-center gap-[4px]'>
              {/* Dev note: Switch these two buttons conditionally */}
              {wallet.publicKey?.toBase58() === offer.seller_wallet && !refresh && (
                <Button
                  disabled={loading}
                  appearance='neutral'
                  isRounded={false}
                  size='sm'
                  onClick={async () => {
                    setLoading(true)
                    const offer_ = await listAuctionHouseNFT(connection, wallet).onAcceptOffer(
                      restProps.sale,
                      offer
                    )
                    console.log(offer_)
                    setLoading(false)
                    notify({
                      message: 'Offer Approved',
                    })
                    setRefresh(true)
                  }}>
                  {loading ? <Spin /> : 'Approve'}
                </Button>
              )}

              {wallet.publicKey?.toBase58() === offer.buyer_wallet && (
                <Button
                  disabled={loading}
                  appearance='ghost'
                  isRounded={false}
                  view='outline'
                  size='sm'
                  onClick={async () => {
                    setLoading(true)
                    const offer_ = await listAuctionHouseNFT(connection, wallet).onCancelOffer(
                      restProps.sale,
                      offer
                    )
                    console.log(offer_)
                    setLoading(false)
                    notify({
                      message: 'Offer Cancelled',
                    })
                    setRefresh(true)
                  }}>
                  {loading ? <Spin /> : 'Cancel'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

AhNFTDetailsCurrentOffers.defaultProps = {}

export default AhNFTDetailsCurrentOffers
