import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Divider,
  Steps,
  Row,
  Col,
  Input,
  Statistic,
  Progress,
  Spin,
  Radio,
  Card,
  Select,
  Checkbox,
} from 'antd'
import { Button, TextField } from '@oyster/common'
import { ArtCard } from './../../components/ArtCard'
import { MINIMUM_SAFE_FEE_AUCTION_CREATION, QUOTE_MINT } from './../../constants'
import { Confetti } from './../../components/Confetti'
import { ArtSelector } from './artSelector'
import {
  MAX_METADATA_LEN,
  useConnection,
  WinnerLimit,
  WinnerLimitType,
  toLamports,
  useMint,
  Creator,
  PriceFloor,
  PriceFloorType,
  IPartialCreateAuctionArgs,
  MetadataKey,
  StringPublicKey,
  WRAPPED_SOL_MINT,
  shortenAddress,
  useNativeAccount,
} from '@oyster/common'
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { useWallet } from '@solana/wallet-adapter-react'
import { MintInfo, MintLayout } from '@solana/spl-token'
import { useHistory, useParams } from 'react-router-dom'
import { WinningConfigType, AmountRange } from '@oyster/common/dist/lib/models/metaplex/index'
import moment from 'moment'
import { createAuctionManager, SafetyDepositDraft } from '../../actions/createAuctionManager'
import BN from 'bn.js'
import { constants } from '@oyster/common'
import { DateTimePicker } from '../../components/DateTimePicker'
import { AmountLabel } from '../../components/AmountLabel'
import { useMeta } from '../../contexts'
import useWindowDimensions from '../../utils/layout'
import { PlusCircleOutlined } from '@ant-design/icons'
import TokenDialog, { TokenButton } from '../../components/TokenDialog'
import { useTokenList } from '../../contexts/tokenList'
import { TokenInfo } from '@solana/spl-token-registry'
import { FundsIssueModal } from '../../components/FundsIssueModal'
import CategoryStep from './CategoryStep'

const { Option } = Select
const { Step } = Steps
const { ZERO } = constants

export enum AuctionCategory {
  InstantSale,
  Limited,
  Single,
  Open,
  Tiered,
}

enum InstantSaleType {
  Limited,
  Single,
  Open,
}

interface TierDummyEntry {
  safetyDepositBoxIndex: number
  amount: number
  winningConfigType: WinningConfigType
}

interface Tier {
  items: (TierDummyEntry | {})[]
  winningSpots: number[]
}
interface TieredAuctionState {
  items: SafetyDepositDraft[]
  tiers: Tier[]
  participationNFT?: SafetyDepositDraft
}

export interface AuctionState {
  // Min price required for the item to sell
  reservationPrice: number

  // listed NFTs
  items: SafetyDepositDraft[]
  participationNFT?: SafetyDepositDraft
  participationFixedPrice?: number
  // number of editions for this auction (only applicable to limited edition)
  editions?: number

  // date time when auction should start UTC+0
  startDate?: Date

  // suggested date time when auction should end UTC+0
  endDate?: Date

  //////////////////
  category: AuctionCategory

  price?: number
  priceFloor?: number
  priceTick?: number

  startSaleTS?: number
  startListTS?: number
  endTS?: number

  auctionDuration?: number
  auctionDurationType?: 'days' | 'hours' | 'minutes'
  gapTime?: number
  gapTimeType?: 'days' | 'hours' | 'minutes'
  tickSizeEndingPhase?: number

  spots?: number
  tiers?: Array<Tier>

  winnersCount: number

  instantSalePrice?: number
  instantSaleType?: InstantSaleType

  quoteMintAddress: string
  quoteMintInfo: MintInfo
  quoteMintInfoExtended: TokenInfo
}

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
