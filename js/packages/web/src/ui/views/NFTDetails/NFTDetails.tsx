import React, { FC } from 'react'
import CN from 'classnames'
import { NFTDetailsTopBar } from '../../sections/NFTDetailsTopBar'
import { NFTDetailsBody } from '../../sections/NFTDetailsBody'

export interface NFTDetailsProps {
  [x: string]: any
}

export const NFTDetails: FC<NFTDetailsProps> = ({ className, ...restProps }: NFTDetailsProps) => {
  const NFTDetailsClasses = CN(`nft-details w-full`, className)

  return (
    <div className={NFTDetailsClasses} {...restProps}>
      <NFTDetailsTopBar className='pt-[20px] pb-[40px]' />
      <NFTDetailsBody className='pb-[100px]' />
    </div>
  )
}

export default NFTDetails
