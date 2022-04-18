import React, { useState } from 'react'
import { Button, TextField } from '@oyster/common'
import { QUOTE_MINT } from './../../constants'
import { useMint, WRAPPED_SOL_MINT } from '@oyster/common'
import { PublicKey } from '@solana/web3.js'
import TokenDialog, { TokenButton } from '../../components/TokenDialog'
import { useTokenList } from '../../contexts/tokenList'
import { AuctionState } from './types'

const NumberOfWinnersStep = (props: {
  attributes: AuctionState
  setAttributes: (attr: AuctionState) => void
  confirm: () => void
}) => {
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [mint, setMint] = useState<PublicKey>(WRAPPED_SOL_MINT)
  const { hasOtherTokens } = useTokenList()

  props.attributes.quoteMintAddress = mint ? mint.toBase58() : QUOTE_MINT.toBase58()

  if (props.attributes.quoteMintAddress) {
    props.attributes.quoteMintInfo = useMint(props.attributes.quoteMintAddress)!
    props.attributes.quoteMintInfoExtended = useTokenList().tokenMap.get(
      props.attributes.quoteMintAddress
    )!
  }

  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[8px]'>
          <h2 className='text-h3'>Tiered Auction</h2>
          <p>Create a Tiered Auction</p>
          <p></p>
        </div>
      </div>

      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[16px]'>
          <div className='flex flex-col gap-[8px]'>
            <h6 className='text-h6'>How many participants can win the auction?</h6>
            <p>This is the number of spots in the leaderboard.</p>
          </div>

          <div className='flex'>
            <TextField
              type='number'
              autoFocus
              className='input'
              placeholder='Number of spots in the leaderboard'
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  winnersCount: parseInt(info.target.value),
                })
              }
            />
          </div>
        </div>

        {hasOtherTokens && (
          <div className='flex flex-col gap-[16px]'>
            <div className='flex flex-col gap-[8px]'>
              <h6 className='text-h6'>Auction mint</h6>
              <p>This will be the quote mint for your auction.</p>
            </div>

            <div className='flex flex-col'>
              <TokenButton mint={mint} onClick={() => setShowTokenDialog(true)} />
              <TokenDialog
                setMint={setMint}
                open={showTokenDialog}
                onClose={() => {
                  setShowTokenDialog(false)
                }}
              />
            </div>
          </div>
        )}

        <div className='flex items-center'>
          <Button appearance='neutral' size='lg' isRounded={false} onClick={props.confirm}>
            Continue
          </Button>
        </div>
      </div>
    </>
  )
}

export default NumberOfWinnersStep
