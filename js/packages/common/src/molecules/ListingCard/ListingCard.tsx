import React, { FC } from 'react'
import CN from 'classnames'
import { Image, MetaChip } from '../../atoms'
import { Solana } from '../../icons'

export interface ListingCardProps {
  [x: string]: any
  image?: string
  name: string
  count?: number | string
  volume?: number | string
  floorPrice?: number | string
  dollarValue?: number | string
}

export const ListingCard: FC<ListingCardProps> = ({
  className,
  image,
  name,
  volume,
  floorPrice,
  dollarValue,
  ...restProps
}: ListingCardProps) => {
  const ListingCardClasses = CN(
    `listing-card shadow-card flex flex-col bg-white rounded overflow-hidden w-full group cursor-pointer relative group`,
    className
  )

  return (
    <div className={ListingCardClasses} {...restProps}>
      <span className='relative flex h-[180px] w-full overflow-hidden'>
        <Image src={image} />
      </span>

      <div className='flex flex-col rounded-b px-[20px] pt-[12px] pb-[20px] transition-all'>
        <h2 className='text-h6 mb-[8px] w-full border-b border-slate-100 pb-[8px] text-center'>
          {name}
        </h2>

        <div className='flex flex-col gap-[8px]'>
          {/* <MetaChip
            align='left'
            overline='Items'
            subHeading={2000}
            className='border-b border-slate-100 pb-[8px]'
          /> */}
          {volume && (
            <MetaChip
              align='left'
              overline='Volume'
              subHeading={
                <div className='flex items-center gap-[4px]'>
                  <Solana size={16} className='flex items-center' />
                  <span className='flex items-center'>{volume}</span>
                </div>
              }
              className='border-b border-slate-100 pb-[8px]'
            />
          )}
          <MetaChip align='left' overline='Price' subHeading={floorPrice} hint={`${dollarValue}`} />
        </div>
      </div>
    </div>
  )
}
