import React from 'react'
import { Button, TextField } from '@oyster/common'
import { ArtSelector } from './artSelector'
import { WRAPPED_SOL_MINT } from '@oyster/common'
import { SafetyDepositDraft } from '../../actions/createAuctionManager'
import { AuctionState } from './types'

const ParticipationStep = (props: {
  attributes: AuctionState
  setAttributes: (attr: AuctionState) => void
  confirm: () => void
}) => {
  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[8px]'>
          <h2 className='text-h3'>Participation NFT</h2>
          <p>Provide NFT that will be awarded as an Open Edition NFT for auction participation.</p>
        </div>
      </div>

      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex w-full'>
          <ArtSelector
            filter={(i: SafetyDepositDraft) =>
              !!i.masterEdition && i.masterEdition.info.maxSupply === undefined
            }
            selected={props.attributes.participationNFT ? [props.attributes.participationNFT] : []}
            setSelected={items => {
              props.setAttributes({
                ...props.attributes,
                participationNFT: items[0],
              })
            }}
            allowMultiple={false}>
            Select Participation NFT
          </ArtSelector>
        </div>

        <div className='flex flex-col gap-[16px]'>
          <div className='flex flex-col gap-[8px]'>
            <h6 className='text-h6'>Price</h6>
            <p>
              This is an optional fixed price that non-winners will pay for your Participation NFT.
            </p>
          </div>

          <div className='flex'>
            <TextField
              type='number'
              min={0}
              autoFocus
              className='input'
              placeholder='Fixed Price'
              iconBefore='◎'
              iconAfter={
                props.attributes.quoteMintInfoExtended
                  ? props.attributes.quoteMintInfoExtended.symbol
                  : props.attributes.quoteMintAddress == WRAPPED_SOL_MINT.toBase58()
                  ? 'SOL'
                  : 'CUSTOM'
              }
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  participationFixedPrice: parseFloat(info.target.value),
                })
              }
            />
          </div>
        </div>

        <div className='flex items-center'>
          <Button appearance='neutral' size='lg' isRounded={false} onClick={props.confirm}>
            Continue to Review
          </Button>
        </div>
      </div>
    </>
  )
}

export default ParticipationStep
