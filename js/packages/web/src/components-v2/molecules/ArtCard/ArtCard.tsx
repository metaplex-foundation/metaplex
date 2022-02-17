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
    `art-card rounded-[8px] overflow-hidden hover:shadow-lg hover:shadow-blue-900/10 cursor-pointer relative group`,
    className
  )
  const [artImage, setArtImage] = useState(image)

  return (
    <div className={ArtCardClasses} {...restProps}>
      <div className='flex flex-col'>
        <img
          src={artImage}
          alt={name}
          onError={() => setArtImage('/img/art-placeholder-sm.jpg')}
          className='h-[140px] w-full object-cover object-top'
        />
      </div>

      <div
        className='hidden group-hover:flex absolute top-0 w-full h-[140px] items-center justify-center bg-gray-800/30 text-white gap-[4px] backdrop-blur-sm rounded-t-[8px]'
        onClick={onClickDetails}
      >
        <i className='text-lg ri-eye-fill' />
        <span className='text-sm'>Show details</span>
      </div>

      <div className='hidden transition-colors group-hover:flex absolute bottom-0 w-full top-[140px]'>
        <button
          className='w-full text-white appearance-none bg-B-400 hover:bg-B-500 font-600'
          onClick={onClickBuy}
        >
          Buy Now
        </button>
      </div>

      <div className='flex px-[12px] pt-[12px] pb-[12px] flex-col gap-[4px] border rounded-b-[8px]'>
        <h3 className='flex text-gray-800 text-md font-600'>
          <span className='line-clamp-1'>{name}</span>
        </h3>

        <div className='flex justify-between items-center gap-[6px]'>
          <span className='text-gray-800 font-500'>{price}</span>

          {bid && <span className='text-B-400 text-md'>Bid {bid}</span>}
          {lastPrice && <span className='text-gray-500 text-md'>Last {lastPrice}</span>}
        </div>
      </div>
    </div>
  )
}

export default ArtCard
