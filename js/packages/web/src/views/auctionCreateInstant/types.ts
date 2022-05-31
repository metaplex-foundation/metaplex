import { WinningConfigType } from '@oyster/common'
import { MintInfo } from '@solana/spl-token'
import { TokenInfo } from '@solana/spl-token-registry'
import { SafetyDepositDraft } from '../../actions/createAuctionManager'

export enum AuctionCategory {
  InstantSale,
  Limited,
  Single,
  Open,
  Tiered,
}

export enum InstantSaleType {
  Limited,
  Single,
  Open,
}

export interface TierDummyEntry {
  safetyDepositBoxIndex: number
  amount: number
  winningConfigType: WinningConfigType
}

export interface Tier {
  items: (TierDummyEntry | {})[]
  winningSpots: number[]
}
export interface TieredAuctionState {
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
