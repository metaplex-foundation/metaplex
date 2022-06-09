import React, { FC, useEffect, useState } from 'react'
import { NFTDetailsTopBar } from '../../sections/NFTDetailsTopBar'
import { AhNFTDetailsBody, NFTDetailsBody } from '../../sections/NFTDetailsBody'
import { Redirect, useParams } from 'react-router-dom'
import { AuctionView, useAuction } from '../../../hooks'
import { listAuctionHouseNFT } from '../../../actions/AuctionHouse'
import { useConnection } from '@oyster/common'
import { useWallet } from '@solana/wallet-adapter-react'

export interface NFTDetailsProps {}
export interface ParamsInterface {
  id: string
}

export const NFTDetails: FC<NFTDetailsProps> = () => {
  const { id } = useParams<{ id: string }>()
  const item = useAuction(id)
  const connection = useConnection()
  const wallet = useWallet()
  const [sale, setSale] = useState()

  const [auction, setAuction] = useState<AuctionView>()

  useEffect(() => {
    const fetchData = async () => {
      const sale = await listAuctionHouseNFT(connection, wallet).getNFTbyMint(id)
      console.log(sale)
      if (!sale) {
        setAuction(item)
      }
      setSale(sale)
    }
    fetchData().catch(console.error)
    setAuction(item)
  }, [item])

  const onSetAuction = (data: AuctionView) => {
    setAuction(undefined)
    if (data) {
      setAuction(() => data)
    }
  }

  return (
    <>
      {!sale && (
        <div className='nft-details w-full'>
          <NFTDetailsTopBar onSetAuction={onSetAuction} id={id} className='pt-[20px] pb-[40px]' />
          {auction && <NFTDetailsBody auction={auction} className='pb-[100px]' />}
        </div>
      )}
      {sale && (
        <>
          <div className='nft-details w-full'>
            <NFTDetailsTopBar onSetAuction={onSetAuction} id={id} className='pt-[20px] pb-[40px]' />
            {sale && <AhNFTDetailsBody sale={sale} className='pb-[100px]' />}
          </div>
        </>
      )}
    </>
  )
}

export function NftNext() {
  const { id } = useParams<{ id: string }>()
  return <Redirect to={`/nft/${id}`} />
}
