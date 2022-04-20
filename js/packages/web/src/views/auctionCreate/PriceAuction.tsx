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

const PriceAuction = (props: {
  attributes: AuctionState
  setAttributes: (attr: AuctionState) => void
  confirm: () => void
}) => {
  console.log(props.attributes)
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
