import React, { FC, useState } from 'react'
import CN from 'classnames'

export interface ArtCardProps {
  [x: string]: any
}

export const ArtCard: FC<ArtCardProps> = ({
  className,
  image,
  name,
  price,
  bid,
  lastPrice,
  onClickBuy,
  onClickDetails,
  ...restProps
}: ArtCardProps) => {
  const ArtCardClasses = CN(
    `nft-art-card rounded-[8px] hover:shadow-lg hover:shadow-blue-900/10 cursor-pointer relative group overflow-hidden`,
    className
  )
  const [artImage, setArtImage] = useState(image)

  return (
    <div className={ArtCardClasses} {...restProps}>
      <div className='flex flex-col overflow-hidden'>
        <img
          src={artImage}
          alt={name}
          onError={() => setArtImage('/img/art-placeholder-sm.jpg')}
          className='h-[130px] w-full object-cover md:h-[unset] lg:h-[140px] lg:object-top'
        />
      </div>

      <div
        className='absolute top-0 hidden h-[140px] w-full items-center justify-center gap-[4px] rounded-t-[8px] bg-gray-800/30 text-white backdrop-blur-sm group-hover:flex'
        onClick={onClickDetails}>
        <i className='ri-eye-fill text-lg' />
        <span className='text-sm'>Show details</span>
      </div>

      <div className='absolute bottom-0 top-[140px] hidden w-full transition-colors group-hover:flex'>
        <button
          className='w-full appearance-none bg-B-400 font-600 text-white hover:bg-B-500'
          onClick={onClickBuy}>
          Buy Now
        </button>
      </div>

      <div className='flex w-full flex-col gap-[4px] rounded-b-[8px] border px-[12px] pt-[12px] pb-[12px]'>
        <h3 className='flex w-full text-md font-600 text-gray-800'>
          <span className='w-full line-clamp-1'>{name}</span>
        </h3>

        <div className='flex items-center justify-between gap-[6px]'>
          <span className='font-500 text-gray-800'>{price}</span>

          {bid && <span className='text-md text-B-400'>Bid {bid}</span>}
          {lastPrice && <span className='text-md text-gray-500'>Last {lastPrice}</span>}
        </div>
      </div>
    </div>
  )
}

export default ArtCard
