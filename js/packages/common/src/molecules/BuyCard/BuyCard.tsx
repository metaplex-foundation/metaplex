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
    `buy-card flex flex-col bg-white rounded overflow-hidden w-full`,
    className
  )

  return (
    <div className={BuyCardClasses} {...restProps}>
      <div className='flex h-[286px] w-full overflow-hidden'>
        <Image src={image} />
      </div>

      <div className='border-N-100 flex flex-col rounded-b border-x border-b px-[20px] pt-[12px] pb-[20px]'>
        <h2 className='border-N-100 text-h4 font-600 w-full border-b pb-[8px] text-center'>
          {name}
        </h2>

        <div className='flex justify-between pt-[12px]'>
          <div className='flex flex-col gap-[8px]'>
            <MetaChip
              overline='Volume'
              subHeading={
                <div className='flex items-center gap-[4px]'>
                  <Solana size={20} />
                  {volume}
                </div>
              }
            />
            <Button appearance='neutral' onClick={onClickButton}>
              View collection
            </Button>
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
      </div>
    </div>
  )
}

export default BuyCard
