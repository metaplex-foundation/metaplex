import React, { useEffect, useState } from 'react'
import { Divider, Row, Statistic, Spin } from 'antd'
import { Button } from '@oyster/common'
import { ArtCard } from './../../components/ArtCard'
import { MINIMUM_SAFE_FEE_AUCTION_CREATION } from './../../constants'
import { MAX_METADATA_LEN, WRAPPED_SOL_MINT, useNativeAccount } from '@oyster/common'
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'
import moment from 'moment'

import { AmountLabel } from '../../components/AmountLabel'
import { useTokenList } from '../../contexts/tokenList'
import { FundsIssueModal } from '../../components/FundsIssueModal'
import { AuctionCategory, AuctionState } from './types'
import { MintLayout } from '@solana/spl-token'

const ReviewStep = (props: {
  confirm: () => void
  attributes: AuctionState
  setAttributes: Function
  connection: Connection
}) => {
  const [showFundsIssueModal, setShowFundsIssueModal] = useState(false)
  const [cost, setCost] = useState(0)
  const { account } = useNativeAccount()
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const rentCall = Promise.all([
      props.connection.getMinimumBalanceForRentExemption(MintLayout.span),
      props.connection.getMinimumBalanceForRentExemption(MAX_METADATA_LEN),
    ])
    // TODO: add
  }, [setCost])

  const balance = (account?.lamports || 0) / LAMPORTS_PER_SOL

  const item = props.attributes.items?.[0]

  const handleConfirm = () => {
    props.setAttributes({
      ...props.attributes,
      startListTS: props.attributes.startListTS || moment().unix(),
      startSaleTS: props.attributes.startSaleTS || moment().unix(),
    })
    props.confirm()
  }

  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[8px]'>
          <h2 className='text-h3'>Review and list</h2>
          <p>Review your listing before publishing.</p>
        </div>
      </div>

      <div className='flex gap-[32px]'>
        {item?.metadata.info && (
          <div className='flex'>
            <ArtCard pubkey={item.metadata.pubkey} small={true} />
          </div>
        )}

        <div className='flex flex-col gap-[28px]'>
          <Statistic
            title='Copies'
            value={props.attributes.editions === undefined ? 'Unique' : props.attributes.editions}
          />

          {cost ? (
            <AmountLabel
              title='Cost to Create'
              amount={cost}
              tokenInfo={useTokenList().tokenMap.get(WRAPPED_SOL_MINT.toString())}
            />
          ) : (
            <Spin />
          )}
        </div>
      </div>

      <Row style={{ display: 'block' }}>
        <Divider />
        <Statistic
          title='Start date'
          value={
            props.attributes.startSaleTS
              ? moment
                  .unix(props.attributes.startSaleTS as number)
                  .format('dddd, MMMM Do YYYY, h:mm a')
              : 'Right after successfully published'
          }
        />

        <br />
        {props.attributes.startListTS && (
          <Statistic
            title='Listing go live date'
            value={moment
              .unix(props.attributes.startListTS as number)
              .format('dddd, MMMM Do YYYY, h:mm a')}
          />
        )}
        <Divider />
        <Statistic
          title='Sale ends'
          value={
            props.attributes.endTS
              ? moment.unix(props.attributes.endTS as number).format('dddd, MMMM Do YYYY, h:mm a')
              : 'Until sold'
          }
        />
      </Row>
      <Row>
        <Button
          appearance='neutral'
          size='lg'
          isRounded={false}
          onClick={() => {
            if (balance < MINIMUM_SAFE_FEE_AUCTION_CREATION) {
              setShowFundsIssueModal(true)
            } else {
              handleConfirm()
            }
          }}>
          {props.attributes.category === AuctionCategory.InstantSale
            ? 'List for Sale'
            : 'Publish Auction'}
        </Button>
        <FundsIssueModal
          message={'Estimated Minimum Fee'}
          minimumFunds={MINIMUM_SAFE_FEE_AUCTION_CREATION}
          currentFunds={balance}
          isModalVisible={showFundsIssueModal}
          onClose={() => setShowFundsIssueModal(false)}
        />
      </Row>
    </>
  )
}

export default ReviewStep
