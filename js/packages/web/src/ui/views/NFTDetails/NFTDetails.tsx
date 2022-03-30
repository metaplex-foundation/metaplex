import React, { FC } from 'react'
import { NFTDetailsTopBar } from '../../sections/NFTDetailsTopBar'
import { NFTDetailsBody } from '../../sections/NFTDetailsBody'
import { useParams } from 'react-router-dom'
import { useAuction } from '../../../hooks'

export interface NFTDetailsProps {}
export interface ParamsInterface {
  id: string
}

export const NFTDetails: FC<NFTDetailsProps> = () => {
  const { id } = useParams<{ id: string }>()
  const auction = useAuction(id)
  // console.log('auction', auction)

  return (
    <div className='nft-details w-full'>
      <NFTDetailsTopBar className='pt-[20px] pb-[40px]' />
      {auction && <NFTDetailsBody auction={auction} className='pb-[100px]' />}
    </div>
  )
}

export default NFTDetails
