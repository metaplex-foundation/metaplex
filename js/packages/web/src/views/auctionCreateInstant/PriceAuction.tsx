import React from 'react'
import { Button, TextField } from '@oyster/common'
import { WRAPPED_SOL_MINT, shortenAddress } from '@oyster/common'
import { AuctionCategory, AuctionState } from './types'

const PriceAuction = (props: {
  attributes: AuctionState
  setAttributes: (attr: AuctionState) => void
  confirm: () => void
}) => {
  const quoteMintName = props.attributes?.quoteMintInfoExtended?.name || 'Custom Token'
  const quoteMintExt =
    props.attributes?.quoteMintInfoExtended?.symbol ||
    shortenAddress(props.attributes.quoteMintAddress)
  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[8px]'>
          <h2 className='text-h3'>Price</h2>
          <p>
            Set the price for your auction.
            {props.attributes.quoteMintAddress != WRAPPED_SOL_MINT.toBase58() &&
              ` Warning! the auction quote mint is `}
            {props.attributes.quoteMintAddress != WRAPPED_SOL_MINT.toBase58() && (
              <a
                href={`https://explorer.solana.com/address/${props.attributes?.quoteMintAddress}`}
                target='_blank'
                rel='noreferrer'>
                {' '}
                {props.attributes?.quoteMintAddress != WRAPPED_SOL_MINT.toBase58() &&
                  `${quoteMintName} (${quoteMintExt})`}
              </a>
            )}
          </p>
        </div>
      </div>

      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        {props.attributes.category === AuctionCategory.Open && (
          <div className='flex flex-col gap-[16px]'>
            <div className='flex flex-col gap-[8px]'>
              <h6 className='text-h6'>Price</h6>
              <p> This is the fixed price that everybody will pay for your Participation NFT.</p>
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
                    // Do both, since we know this is the only item being sold.
                    participationFixedPrice: parseFloat(info.target.value),
                    priceFloor: parseFloat(info.target.value),
                  })
                }
              />
            </div>
          </div>
        )}

        {props.attributes.category !== AuctionCategory.Open && (
          <div className='flex flex-col gap-[16px]'>
            <div className='flex flex-col gap-[8px]'>
              <h6 className='text-h6'>Price Floor</h6>
              <p>This is the starting bid price for your auction.</p>
            </div>

            <div className='flex'>
              <TextField
                type='number'
                min={0}
                autoFocus
                className='input'
                placeholder='Price'
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
                    priceFloor: parseFloat(info.target.value),
                  })
                }
              />
            </div>
          </div>
        )}

        <div className='flex flex-col gap-[16px]'>
          <div className='flex flex-col gap-[8px]'>
            <h6 className='text-h6'>Tick Size</h6>
            <p>All bids must fall within this price increment.</p>
          </div>

          <div className='flex'>
            <TextField
              type='number'
              min={0}
              className='input'
              placeholder={`Tick size in ${
                props.attributes.quoteMintInfoExtended
                  ? props.attributes.quoteMintInfoExtended.symbol
                  : props.attributes.quoteMintAddress == WRAPPED_SOL_MINT.toBase58()
                  ? 'SOL'
                  : 'your custom currency'
              }`}
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
                  priceTick: parseFloat(info.target.value),
                })
              }
            />
          </div>
        </div>

        <div className='flex items-center'>
          <Button appearance='neutral' size='lg' isRounded={false} onClick={props.confirm}>
            Continue
          </Button>
        </div>
      </div>
    </>
  )
}

export default PriceAuction
