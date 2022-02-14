import React, { FC, forwardRef, useEffect, useState } from 'react'
import CN from 'classnames'
import VerifiedBadgeIcon from '../../icons/VerifiedBadge'
import axios from 'axios'

export interface NftCardProps {
  [x: string]: any
}

export const NftCard: FC<NftCardProps> = forwardRef(
  (
    {
      className,
      name,
      description,
      itemsCount,
      floorPrice,
      isVerified,
      image,
      ...restProps
    }: NftCardProps,
    ref: any
  ) => {
    const NftCardClasses = CN(
      `nft-card flex flex-col bg-gray-50 rounded-[8px] overflow-hidden h-full cursor-pointer hover:bg-gray-100 transition-all`,
      className
    )
    const [uriState, setUriState] = useState<string | undefined>()

    useEffect(() => {
      try {
        const getImage = async () => {
          const img = await axios.get(`${image}`)
          setUriState(img.data.image)
        }
        getImage()
      } catch {
        console.log('error')
      }
    }, [image])

    return (
      <div className={NftCardClasses} {...restProps} ref={ref}>
        <div className='flex flex-col'>
          <img
            src={uriState}
            alt={name}
            className='h-[180px] w-full object-cover object-center lg:h-[228px]'
          />

          <span className='h-[8px] w-full bg-[linear-gradient(89.57deg,_#3E9CD1_0.79%,_#224CB8_124%)]' />
        </div>

        <div className='flex flex-col gap-[4px] px-[20px] pt-[20px] pb-[28px] lg:gap-[8px] lg:px-[28px]'>
          <h3 className='flex gap-[8px] text-base'>
            <span className='line-clamp-1'>{name}</span>

            {isVerified && (
              <VerifiedBadgeIcon
                width={16}
                height={16}
                className='relative top-[4px] flex-shrink-0'
              />
            )}
          </h3>

          <p className='text-md text-gray-600 line-clamp-2'>{description}</p>

          <div className='flex items-center gap-[6px] text-md font-500 text-gray-700'>
            <span>
              {itemsCount} {itemsCount > 1 ? 'items' : 'item'}
            </span>
            <span>|</span>
            <span>FP {floorPrice}</span>
          </div>
        </div>
      </div>
    )
  }
)

export default NftCard
