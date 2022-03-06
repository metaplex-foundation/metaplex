import React, { FC, forwardRef } from 'react'
import CN from 'classnames'
import VerifiedBadgeIcon from '../../icons/VerifiedBadge'
import { useExtendedArt } from '../../../hooks'

export interface NftCardProps {
  [x: string]: any
}

export const NftCard: FC<NftCardProps> = forwardRef(
  ({ className, image, pubkey, itemsCount, ...restProps }: NftCardProps) => {
    const NftCardClasses = CN(
      `nft-card flex flex-col bg-gray-50 rounded-[8px] overflow-hidden h-full cursor-pointer hover:bg-gray-100 transition-all`,
      className
    )
    console.log('NFTCARD')
    console.log(pubkey)
    console.log('NFTCARD')
    const { ref, data } = useExtendedArt(pubkey)

    console.log(data)
    const isVerified = true

    return (
      <div className={NftCardClasses} {...restProps} ref={ref}>
        <div className='flex flex-col'>
          <img
            src={data?.image}
            alt={(data as any)?.collection.name}
            className='h-[228px] w-full object-cover object-center'
          />

          <span className='h-[8px] w-full bg-[linear-gradient(89.57deg,_#3E9CD1_0.79%,_#224CB8_124%)]' />
        </div>

        <div className='flex flex-col gap-[8px] px-[28px] pt-[20px] pb-[28px]'>
          <h3 className='flex gap-[8px] text-base'>
            <span className='line-clamp-1'>{(data as any)?.collection.name}</span>

            {isVerified && (
              <VerifiedBadgeIcon
                width={16}
                height={16}
                className='relative top-[4px] flex-shrink-0'
              />
            )}
          </h3>

          <p className='text-md text-gray-600 line-clamp-2'>{(data as any)?.collection.name}</p>

          <div className='flex items-center gap-[6px] text-md font-500 text-gray-700'>
            <span>{itemsCount} items</span>
            <span>|</span>
          </div>
        </div>
      </div>
    )
  }
)

export default NftCard
