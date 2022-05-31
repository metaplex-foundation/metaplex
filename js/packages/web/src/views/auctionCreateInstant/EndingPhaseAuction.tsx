import React from 'react'
import { Select } from 'antd'
import { Button, TextField } from '@oyster/common'
import { AuctionState } from './types'

const { Option } = Select

const EndingPhaseAuction = (props: {
  attributes: AuctionState
  setAttributes: (attr: AuctionState) => void
  confirm: () => void
}) => {
  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[8px]'>
          <h2 className='text-h3'>Ending Phase</h2>
          <p>Set the terms for your auction.</p>
        </div>
      </div>

      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[16px]'>
          <div className='flex flex-col gap-[8px]'>
            <h6 className='text-h6'>Auction Duration</h6>
            <p>This is how long the auction will last for.</p>
          </div>

          <div className='flex items-center gap-[8px]'>
            <TextField
              autoFocus
              type='number'
              className='input'
              placeholder='Set the auction duration'
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  auctionDuration: parseInt(info.target.value),
                })
              }
            />
            <Select
              defaultValue={props.attributes.auctionDurationType}
              onChange={value =>
                props.setAttributes({
                  ...props.attributes,
                  auctionDurationType: value,
                })
              }>
              <Option value='minutes'>Minutes</Option>
              <Option value='hours'>Hours</Option>
              <Option value='days'>Days</Option>
            </Select>
          </div>
        </div>

        <div className='flex flex-col gap-[16px]'>
          <div className='flex flex-col gap-[8px]'>
            <h6 className='text-h6'>Gap Time</h6>
            <p>
              The final phase of the auction will begin when there is this much time left on the
              countdown. Any bids placed during the final phase will extend the end time by this
              same duration.
            </p>
          </div>

          <div className='flex items-center gap-[8px]'>
            <TextField
              type='number'
              className='input'
              placeholder='Set the gap time'
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  gapTime: parseInt(info.target.value),
                })
              }
            />
            <Select
              defaultValue={props.attributes.gapTimeType}
              onChange={value =>
                props.setAttributes({
                  ...props.attributes,
                  gapTimeType: value,
                })
              }>
              <Option value='minutes'>Minutes</Option>
              <Option value='hours'>Hours</Option>
              <Option value='days'>Days</Option>
            </Select>
          </div>
        </div>

        <div className='flex flex-col gap-[16px]'>
          <div className='flex flex-col gap-[8px]'>
            <h6 className='text-h6'>Tick Size for Ending Phase</h6>
            <p>
              In order for winners to move up in the auction, they must place a bid that’s at least
              this percentage higher than the next highest bid.
            </p>
          </div>

          <div className='flex items-center gap-[8px]'>
            <TextField
              type='number'
              className='input'
              placeholder='Percentage'
              iconAfter='%'
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  tickSizeEndingPhase: parseInt(info.target.value),
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

export default EndingPhaseAuction
