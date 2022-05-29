import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Image } from '@oyster/common'
import { getOffers } from '../../../api'
import { useWallet } from '@solana/wallet-adapter-react'

export interface ProfileOffersReceivedProps {
  [x: string]: any
}

export const ProfileOffersReceived: FC<ProfileOffersReceivedProps> = ({
  className, setTag,
  ...restProps
}: ProfileOffersReceivedProps) => {
  const ProfileOffersReceivedClasses = CN(
    `profile-offers-received flex flex-col gap-[8px]`,
    className
  )

  const { publicKey } = useWallet()
  const [offers, setOffers] = useState([])

  React.useEffect(() => {
    console.log('Called')
    if (publicKey && publicKey.toBase58()) {
      getOffers('seller', publicKey.toBase58())
        .then(res => {
          setOffers((res || []).map(i => ({
            image: i.url,
            title: i.nft_name,
            owner: i.buyer_wallet?.substring(0, 3) + '...' + i.buyer_wallet?.substring(i.buyer_wallet.length - 4),
            price: i.offer_price,
            time: i.createdAt?.replace('T', ' ').replace('Z', ''),
          })))
          setTag(res.length > 1 ? res.length + ' Offers' : res.length + ' Offer')
        })
        .catch((error: any) => {
          console.log(error.message)
        })
      }
  }, [])

  return (
    <div className={ProfileOffersReceivedClasses} {...restProps}>
      <div className='grid w-full cursor-pointer grid-cols-[1.5fr_1fr_1fr_1fr] items-center gap-[8px] py-[4px] px-[4px] text-md font-500 text-slate-500 hover:bg-slate-50'>
        <div className='flex items-center gap-[8px]'>
          <span className='font-500'>NFT</span>
        </div>
        <span>Price</span>
        <span>From</span>
        <span>Date</span>
      </div>

      {offers.map(({ image, title, price, owner, time }: any, index: number) => (
        <div
          key={index}
          className='grid w-full cursor-pointer grid-cols-[1.5fr_1fr_1fr_1fr] items-center gap-[8px] rounded-[8px] border border-slate-200 bg-white py-[4px] px-[4px] text-md hover:bg-slate-50'>
          <div className='flex items-center gap-[8px]'>
            <div className='flex h-[40px] w-[40px] overflow-hidden rounded-[8px]'>
              <Image src={image} />
            </div>
            <span className='font-500'>{title}</span>
          </div>
          <span>{price}</span>
          <span>{owner}</span>
          <span>{time}</span>
        </div>
      ))}
    </div>
  )
}

ProfileOffersReceived.defaultProps = {}

export default ProfileOffersReceived
