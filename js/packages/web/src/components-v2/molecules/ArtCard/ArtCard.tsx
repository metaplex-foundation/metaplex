import React, { FC, useMemo, useState } from 'react'
import CN from 'classnames'
import { useExtendedArt } from '../../../hooks'
import { useAuctionStatus } from '../../../components/AuctionRenderCard/hooks/useAuctionStatus'
import { useTokenList } from '../../../contexts/tokenList'
import { AmountLabel } from '../../../components/AmountLabel'

export interface ArtCardProps {
  [x: string]: any
}

export const ArtCard: FC<ArtCardProps> = ({
  pubkey,
  className,
  onClickBuy,
  onClickDetails,
  auction,
  ...restProps
}: ArtCardProps) => {
  const ArtCardClasses = CN(
    `nft-art-card rounded-[8px] hover:shadow-lg hover:shadow-blue-900/10 cursor-pointer relative group overflow-hidden`,
    className
  )
  const [artImage, setArtImage] = useState('')

  const { ref, data } = useExtendedArt(pubkey)
  const tokenInfo = useTokenList().subscribedTokens.filter(
    m => m.address == auction.auction.info.tokenMint
  )[0]
  const { status, amount } = useAuctionStatus(auction)

  return (
    <div className={ArtCardClasses} {...restProps}>
      <div className='flex flex-col overflow-hidden'>
        <img
          src={data?.image}
          alt={data?.image}
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
          <span className='w-full line-clamp-1'>{data?.name}</span>
        </h3>

        <div className='flex items-center justify-between gap-[6px]'>
          <AmountLabel
            containerStyle={{ flexDirection: 'row' }}
            title={status}
            amount={amount}
            iconSize={24}
            tokenInfo={tokenInfo}
          />
        </div>
      </div>
    </div>
  )
}
