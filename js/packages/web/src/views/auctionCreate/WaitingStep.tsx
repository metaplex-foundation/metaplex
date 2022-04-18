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

const WaitingStep = (props: { createAuction: () => Promise<void>; confirm: () => void }) => {
  const [progress, setProgress] = useState<number>(0)

  useEffect(() => {
    const func = async () => {
      const inte = setInterval(() => setProgress(prog => Math.min(prog + 1, 99)), 600)
      await props.createAuction()
      clearInterval(inte)
      props.confirm()
    }
    func()
  }, [])

  return (
    <div
      style={{
        marginTop: 70,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
      <Progress type='circle' percent={progress} />
      <div className='waiting-title'>Your creation is being listed with Metaplex...</div>
      <div className='waiting-subtitle'>This can take up to 30 seconds.</div>
    </div>
  )
}

export default WaitingStep
