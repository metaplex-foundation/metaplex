import React from 'react'
import { Button } from '@oyster/common'
import { AuctionCategory } from './types'

const CategoryStep = (props: { confirm: (category: AuctionCategory) => void }) => {
  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[12px]'>
          <h2 className='text-h3'>List an item</h2>
          <p className='text-md'>
            First time listing on Metaplex?{' '}
            <a href='#' target='_blank' rel='noreferrer' className='text-B-500'>
              Read our sellers guide.
            </a>
          </p>
        </div>
      </div>

      <div className='flex max-w-[700px] flex-col gap-[12px]'>
        <Button
          appearance='neutral'
          isRounded={false}
          className='!h-[60px]'
          onClick={() => props.confirm(AuctionCategory.InstantSale)}>
          <div>
            <div>Instant Sale</div>
            <div className='type-btn-description font-400 normal-case'>
              At a fixed price, sell a single Master NFT or copies of it
            </div>
          </div>
        </Button>

        <Button
          appearance='neutral'
          isRounded={false}
          className='!h-[60px]'
          onClick={() => props.confirm(AuctionCategory.Limited)}>
          <div>
            <div>Limited Edition</div>
            <div className='type-btn-description font-400 normal-case'>
              Sell a limited copy or copies of a single Master NFT
            </div>
          </div>
        </Button>

        <Button
          appearance='neutral'
          isRounded={false}
          className='!h-[60px]'
          onClick={() => props.confirm(AuctionCategory.Open)}>
          <div>
            <div>Open Edition</div>
            <div className='type-btn-description font-400 normal-case'>
              Sell unlimited copies of a single Master NFT
            </div>
          </div>
        </Button>

        <Button
          appearance='neutral'
          isRounded={false}
          className='!h-[60px]'
          onClick={() => props.confirm(AuctionCategory.Tiered)}>
          <div>
            <div>Tiered Auction</div>
            <div className='type-btn-description font-400 normal-case'>
              Participants get unique rewards based on their leaderboard rank
            </div>
          </div>
        </Button>

        <Button
          appearance='neutral'
          isRounded={false}
          className='!h-[60px]'
          onClick={() => props.confirm(AuctionCategory.Single)}>
          <div>
            <div>Sell an Existing Item</div>
            <div className='type-btn-description font-400 normal-case'>
              Sell an existing item in your NFT collection, including Master NFTs
            </div>
          </div>
        </Button>
      </div>
    </>
  )
}

export default CategoryStep
