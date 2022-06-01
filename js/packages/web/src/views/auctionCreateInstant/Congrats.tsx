import React from 'react'
import { Button } from '@oyster/common'
import { Confetti } from '../../components/Confetti'
import { StringPublicKey } from '@oyster/common'
import { useHistory } from 'react-router-dom'

const Congrats = (props: {
  auction?: {
    vault: StringPublicKey
    auction: StringPublicKey
    auctionManager: StringPublicKey
  }
}) => {
  const history = useHistory()

  const newTweetURL = () => {
    const params = {
      text: "I've created a new NFT auction on Metaplex, check it out!",
      url: `${window.location.origin}/#/auction/${props.auction?.auction.toString()}`,
      hashtags: 'NFT,Crypto,Metaplex',
      // via: "Metaplex",
      related: 'Metaplex,Solana',
    }
    const queryParams = new URLSearchParams(params).toString()
    return `https://twitter.com/intent/tweet?${queryParams}`
  }

  return (
    <>
      <div className='flex w-full flex-col justify-center gap-[40px]'>
        <h1 className='text-center text-display-md'>
          Congratulations!
          <br />
          Your auction is now live.
        </h1>

        <div className='flex flex-col items-center justify-center gap-[16px]'>
          <div className='inline-flex'>
            <Button
              appearance='neutral'
              className='w-[260px]'
              isRounded={false}
              iconAfter={<i className='ri-arrow-right-s-line' />}
              onClick={() => window.open(newTweetURL(), '_blank')}>
              Share it on Twitter
            </Button>
          </div>

          <div className='inline-flex'>
            <Button
              appearance='primary'
              className='w-[260px]'
              isRounded={false}
              iconAfter={<i className='ri-arrow-right-s-line' />}
              onClick={() => {
                history.push(`/`)
                history.go(0)
              }}>
              See it in your auctions
            </Button>
          </div>
        </div>
      </div>
      <Confetti />
    </>
  )
}

export default Congrats
