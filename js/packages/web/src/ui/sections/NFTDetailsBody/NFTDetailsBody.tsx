import React, { FC } from 'react'
import CN from 'classnames'
import { AttributesCard, Button } from '@oyster/common'
import { Image, Avatar, SOLIcon } from '@oyster/common'
import { NFTDetailsTabs } from './../NFTDetailsTabs'
import { AuctionView, useCreators, useExtendedArt } from '../../../hooks'
import { useCollections } from '../../../hooks/useCollections'
import useNFTData from '../../../hooks/useNFTData'
import { AuctionCard } from '../../../components/AuctionCard'

export interface NFTDetailsBodyProps {
  className: string
  auction: AuctionView
}

export const NFTDetailsBody: FC<NFTDetailsBodyProps> = ({ className, auction }) => {
  const { data } = useExtendedArt(auction?.thumbnail.metadata.pubkey)
  const { liveCollections } = useCollections()

  const pubkey = liveCollections.find(({ mint }) => mint === data?.collection)?.pubkey || undefined
  const { data: collection } = useExtendedArt(pubkey)

  const creators = useCreators(auction)
  const {
    value: { solVal, usdValFormatted },
  } = useNFTData(auction)

  const url = data?.image

  const NFTDetailsBodyClasses = CN(`nft-details-body w-full`, className)
  return (
    <div className={NFTDetailsBodyClasses}>
      <div className='container flex gap-[40px] rounded border border-slate-200 bg-white p-[40px] shadow-card-light'>
        <div className='sidebar flex w-[400px] flex-shrink-0 flex-col gap-[40px]'>
          <span className='w-full overflow-hidden rounded-[8px]'>
            <Image src={url} />
          </span>

          <div className='flex flex-col gap-[16px]'>
            <h5 className='text-h5 font-500'>Description</h5>
            <p className='text-md text-slate-600'>{data?.description}</p>
          </div>

          {!!data?.attributes?.length && (
            <div className='flex flex-col gap-[16px]'>
              <h5 className='text-h5 font-500'>Attributes</h5>

              <div className='flex w-full flex-col gap-[8px]'>
                {(data?.attributes || []).map(
                  ({ trait_type: label, value }: any, index: number) => (
                    <AttributesCard
                      key={`${index}-${label}`}
                      overline={label}
                      label={value}
                      tag={`🔥 '14.14%`}
                      hasHoverEffect={false}
                      className='cursor-auto !py-[12px] !px-[16px]'
                    />
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <div className='content flex w-full flex-col'>
          <div className='flex flex-col gap-[28px]'>
            <div className='flex flex-col gap-[16px]'>
              <div className='flex flex-col gap-[4px]'>
                <h2 className='text-h2 font-500 text-slate-800'>{data?.name}</h2>
                {collection?.name && (
                  <div className='flex items-center gap-[4px]'>
                    <h6 className='text-h6 font-400'>{collection?.name}</h6>
                    <i className='ri-checkbox-circle-fill text-[24px] text-green-400' />
                  </div>
                )}
              </div>
              {(creators || []).map(({ image, address }) => {
                return (
                  <Avatar
                    key={address}
                    address={address}
                    image={image}
                    label={`Owned by — ${address?.substring(0, 3)}...${address?.substring(
                      address.length - 3
                    )}`}
                    size={32}
                    labelClassName='text-sm font-500 text-B-400'
                  />
                )
              })}
            </div>

            <div className='flex flex-col gap-[12px]'>
              <h5 className='text-h6 font-400'>Current price</h5>
              <div className='flex items-center gap-[8px]'>
                <SOLIcon size={24} />
                <h4 className='text-h4 font-600 leading-[1]'>{solVal} SOL</h4>
                <span className='ml-[4px] text-lg text-slate-500'>{usdValFormatted}</span>
              </div>
            </div>

            {auction && <AuctionCard auctionView={auction} hideDefaultAction={false} />}
            {/* <div className='flex items-center gap-[16px]'>
              <Button size='lg' className='w-[230px]'>
                Buy Now
              </Button>

              <div className='flex h-[56px] max-w-[295px] items-center rounded-full border border-slate-200 py-[4px] pr-[4px] pl-[20px] focus-within:border-N-800 focus-within:!shadow-[0px_0px_0px_1px_#040D1F]'>
                <div className='flex h-full items-center gap-[8px]'>
                  <SOLIcon size={18} />
                  <input
                    type='text'
                    placeholder='Enter'
                    className='h-full w-full appearance-none bg-transparent outline-none'
                  />
                </div>
                <Button appearance='neutral' size='md' className='h-full w-[180px] flex-shrink-0'>
                  Place Bid
                </Button>
              </div>
            </div> */}

            <NFTDetailsTabs auction={auction} />
          </div>
        </div>
      </div>
    </div>
  )
}
