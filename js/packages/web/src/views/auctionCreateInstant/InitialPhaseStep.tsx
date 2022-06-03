import React, { useEffect, useState } from 'react'
import { Radio } from 'antd'
import { Button } from '@oyster/common'
import moment from 'moment'
import { DateTimePicker } from '../../components/DateTimePicker'
import { AuctionState } from './types'

const InitialPhaseStep = (props: {
  attributes: AuctionState
  setAttributes: (attr: AuctionState) => void
  confirm: () => void
}) => {
  const [startNow, setStartNow] = useState<boolean>(true)
  const [listNow, setListNow] = useState<boolean>(true)

  const [saleMoment, setSaleMoment] = useState<moment.Moment | undefined>(
    props.attributes.startSaleTS ? moment.unix(props.attributes.startSaleTS) : undefined
  )
  const [listMoment, setListMoment] = useState<moment.Moment | undefined>(
    props.attributes.startListTS ? moment.unix(props.attributes.startListTS) : undefined
  )

  useEffect(() => {
    props.setAttributes({
      ...props.attributes,
      startSaleTS: saleMoment && saleMoment.unix(),
    })
  }, [saleMoment])

  useEffect(() => {
    props.setAttributes({
      ...props.attributes,
      startListTS: listMoment && listMoment.unix(),
    })
  }, [listMoment])

  useEffect(() => {
    if (startNow) {
      setSaleMoment(undefined)
      setListNow(true)
    } else {
      setSaleMoment(moment())
    }
  }, [startNow])

  useEffect(() => {
    if (listNow) setListMoment(undefined)
    else setListMoment(moment())
  }, [listNow])

  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[8px]'>
          <h2 className='text-h3'>Initial {'&'} Ending Phase</h2>
        </div>
      </div>

      <div className='flex flex-col gap-[16px]'>
        <div className='flex flex-col gap-[8px]'>
          <h6 className='text-h6'>When do you want the auction to begin?</h6>
        </div>

        <div className='flex'>
          <Radio.Group
            defaultValue='now'
            onChange={info => setStartNow(info.target.value === 'now')}>
            <Radio className='radio-field' value='now'>
              Immediately
            </Radio>
            <div className='radio-subtitle'>
              Participants can buy the NFT as soon as you finish setting up the auction.
            </div>

            <Radio className='radio-field' value='later'>
              At a specified date
            </Radio>
            <div className='radio-subtitle'>
              Participants can start buying the NFT at a specified date.
            </div>
          </Radio.Group>
        </div>
      </div>

      {!startNow && (
        <div className='flex flex-col gap-[16px]'>
          <h6 className='text-h6'>Auction Start Date</h6>

          <div className='flex'>
            {saleMoment && (
              <DateTimePicker
                momentObj={saleMoment}
                setMomentObj={setSaleMoment}
                datePickerProps={{
                  disabledDate: (current: moment.Moment) =>
                    current && current < moment().endOf('day'),
                }}
              />
            )}
          </div>
        </div>
      )}

      <div className='flex flex-col gap-[16px]'>
        <div className='flex flex-col gap-[8px]'>
          <h6 className='text-h6'>When do you want the listing to go live?</h6>
        </div>

        <div className='flex flex-col gap-[16px]'>
          <Radio.Group
            defaultValue='now'
            onChange={info => setListNow(info.target.value === 'now')}>
            <Radio className='radio-field' value='now' defaultChecked={true}>
              Immediately
            </Radio>
            <div className='radio-subtitle'>
              Participants will be able to view the listing with a countdown to the start date as
              soon as you finish setting up the sale.
            </div>
            <Radio className='radio-field' value='later'>
              At a specified date
            </Radio>
            <div className='radio-subtitle'>
              Participants will be able to view the listing with a countdown to the start date at
              the specified date.
            </div>
          </Radio.Group>
        </div>

        {!listNow && (
          <>
            <div className='flex flex-col gap-[16px]'>
              <div className='flex flex-col gap-[8px]'>
                <h6 className='text-h6'>Preview Start Date</h6>
              </div>

              <div className='flex'>
                {listMoment && (
                  <DateTimePicker
                    momentObj={listMoment}
                    setMomentObj={setListMoment}
                    datePickerProps={{
                      disabledDate: (current: moment.Moment) =>
                        current &&
                        saleMoment &&
                        (current < moment().endOf('day') || current > saleMoment),
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {false && <div className='flex items-center'>
        <Button appearance='neutral' size='lg' isRounded={false} onClick={props.confirm}>
          Continue
        </Button>
      </div>}
    </>
  )
}

export default InitialPhaseStep
