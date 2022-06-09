import React, { FC, useEffect } from 'react'
import CN from 'classnames'
import { Tooltip } from 'antd'
import { AuctionView, useAhExtendedArt, useArt } from '../../../hooks'
import { useState } from 'react'
import { CopyOutlined } from '@ant-design/icons'

export interface NFTDetailsInfoProps {
  sale: any
}

export const AhNFTDetailsInfo: FC<NFTDetailsInfoProps> = ({ sale }) => {
  const NFTDetailsInfoClasses = CN(`nft-details-info w-full`)
  const art = useArt(sale.metadata.pubkey)
  const [mint, setMint] = useState<string>()
  const [tokenAddress, setTokenAddress] = useState<string>()
  const [owner, setOwner] = useState<any>()
  const [royalties, setRoyalties] = useState<number>()
  const [transactionFee, setTransactionFee] = useState<string>()
  const { data } = useAhExtendedArt(sale?.metadata)

  useEffect(() => {
    if (sale && sale.metadata && sale.metadata.account && sale.metadata.info) {
      setMint(sale.metadata.info.mint)
      setTokenAddress(sale.metadata.pubkey)
      setRoyalties(art.seller_fee_basis_points)
      setTransactionFee('2')
    }
    setOwner(sale?.seller_wallet || '')
  }, [])

  return (
    <div className={NFTDetailsInfoClasses}>
      <div className='grid w-full grid-cols-1 gap-[4px]'>
        <div className='grid w-full grid-cols-2 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md text-slate-800 shadow-card'>
          <label className='font-500'>Mint address</label>
          <Tooltip title='Address copied'>
            <div
              className='flex items-center gap-[4px] font-500'
              onMouseOver={() => navigator.clipboard.writeText(mint || '')}>
              <CopyOutlined />
              {`${mint?.substring(0, 3)}...${mint?.substring(mint.length - 4)}`}
            </div>
          </Tooltip>
        </div>

        <div className='grid w-full grid-cols-2 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md text-slate-800 shadow-card'>
          <label className='font-500'>Token address</label>
          <Tooltip title='Address copied'>
            <div
              className='flex items-center gap-[4px] font-500'
              onMouseOver={() => navigator.clipboard.writeText(tokenAddress || '')}>
              <CopyOutlined />
              {`${tokenAddress?.substring(0, 3)}...${tokenAddress?.substring(
                tokenAddress.length - 4
              )}`}
            </div>
          </Tooltip>
        </div>

        <div className='grid w-full grid-cols-2 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md text-slate-800 shadow-card'>
          <label className='font-500'>Owner</label>
          <Tooltip title='Address copied'>
            <div
              className='flex items-center gap-[4px] font-500'
              onMouseOver={() => navigator.clipboard.writeText(owner || '')}>
              <CopyOutlined />
              {`${owner?.substring(0, 3)}...${owner?.substring(owner.length - 4)}`}
            </div>
          </Tooltip>
        </div>

        <div className='grid w-full grid-cols-2 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md text-slate-800 shadow-card'>
          <label className='font-500'>Artist royalties</label>
          <span>{((royalties || 0) / 100).toFixed(2)}%</span>
        </div>

        <div className='grid w-full grid-cols-2 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md text-slate-800 shadow-card'>
          <label className='font-500'>Transaction fee</label>
          <span>{transactionFee}%</span>
        </div>

        <div className='grid w-full grid-cols-2 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md text-slate-800 shadow-card'>
          <label className='font-500'>Listing / Bidding / Cancel</label>
          <span>Free</span>
        </div>

        <div className='grid w-full grid-cols-2 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md text-slate-800 shadow-card'>
          <label className='font-500'>Moonrank</label>
          {/* <span>5711</span> */}
        </div>

        <div className='grid w-full grid-cols-2 items-center rounded-[8px] border border-slate-200 bg-white p-[8px] text-md text-slate-800 shadow-card'>
          <label className='font-500'>HowRare.is</label>
          {/* <span>5917</span> */}
        </div>
      </div>
    </div>
  )
}

AhNFTDetailsInfo.defaultProps = {}

export default AhNFTDetailsInfo
