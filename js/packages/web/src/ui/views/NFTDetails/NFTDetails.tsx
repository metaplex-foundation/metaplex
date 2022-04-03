import React, { FC, useEffect, useState } from 'react'
import { NFTDetailsTopBar } from '../../sections/NFTDetailsTopBar'
import { NFTDetailsBody } from '../../sections/NFTDetailsBody'
import { Redirect, useParams } from 'react-router-dom'
import { AuctionView, useAuction } from '../../../hooks'

export interface NFTDetailsProps {}
export interface ParamsInterface {
  id: string
}

export const NFTDetails: FC<NFTDetailsProps> = () => {
  const { id } = useParams<{ id: string }>()
  const item = useAuction(id)

  const [auction, setAuction] = useState<AuctionView>()

  useEffect(() => {
    // console.log('calling')

    setAuction(item)
  }, [item])

  // console.log('auction=>', auction)

  const onSetAuction = (data: AuctionView) => {
    // console.log('data', data)
    setAuction(undefined)
    if (data) {
      setAuction(() => data)
    }
  }

  return (
    <div className='nft-details w-full'>
      <NFTDetailsTopBar onSetAuction={onSetAuction} id={id} className='pt-[20px] pb-[40px]' />
      {auction && <NFTDetailsBody auction={auction} className='pb-[100px]' />}
    </div>
  )
}

export function NftNext() {
  const { id } = useParams<{ id: string }>()

  return <Redirect to={`/nft/${id}`} />
}
