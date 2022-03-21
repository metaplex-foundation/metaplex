import React, { FC } from 'react'
import CN from 'classnames'
import { Image, Button, MetaChip } from '../../atoms'
import { Solana } from '../../icons'

export interface BuyCardProps {
  [x: string]: any
  name?: string
  image?: string
  volume?: string
  floorPrice?: string
  dollarValue?: string
  onClickButton?: any
  hasIndicator?: boolean
}

export const BuyCard: FC<BuyCardProps> = ({
  className,
  name,
  image,
  volume,
  floorPrice,
  dollarValue,
  onClickButton,
  ...restProps
}: BuyCardProps) => {
  const BuyCardClasses = CN(
    `buy-card flex flex-col bg-white rounded overflow-hidden w-full group transition-all cursor-pointer shadow-card`,
    className
  )

  return (
    <div className={BuyCardClasses} {...restProps}>
      <div className='flex h-[286px] w-full overflow-hidden transition-all'>
        <Image src={image} />
      </div>

      <div className='flex flex-col rounded-b px-[20px] pt-[12px] pb-[20px] transition-all'>
        <h2 className='text-h5 w-full border-b border-slate-100 pb-[8px] text-center'>{name}</h2>

        <div className='flex justify-between pt-[12px]'>
          <div className='flex flex-col gap-[8px]'>
            <MetaChip
              overline='Volume'
              subHeading={
                <div className='flex items-center gap-[4px]'>
                  <Solana size={16} className='flex items-center' />
                  <span className='flex items-center'>{volume}</span>
                </div>
              }
            />
          </div>

          <div className='flex'>
            <MetaChip
              align='right'
              overline='Floor Price'
              subHeading={floorPrice}
              hint={dollarValue}
            />
          </div>
        </div>

        <div className='flex w-full pt-[12px]'>
          <Button appearance='neutral' className='w-full' onClick={onClickButton}>
            View collection
          </Button>
        </div>
      </div>
    </div>
  )
}

export default BuyCard
