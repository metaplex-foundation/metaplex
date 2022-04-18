import { useState } from 'react'
import {
  AmountRange,
  IPartialCreateAuctionArgs,
  PriceFloor,
  PriceFloorType,
  StringPublicKey,
  toLamports,
  useConnection,
  useMeta,
  useMint,
  WinnerLimit,
  WinnerLimitType,
  WinningConfigType,
  WRAPPED_SOL_MINT,
  ZERO,
} from '@oyster/common'
import { useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { BN } from 'bn.js'
import { createAuctionManager, SafetyDepositDraft } from '../../actions/createAuctionManager'
import { QUOTE_MINT } from '../../constants'
import {
  AuctionCategory,
  AuctionState,
  InstantSaleType,
  TierDummyEntry,
  TieredAuctionState,
} from '../auctionCreate/types'
import PutOnSale from './PutOnSale'

interface InstantSaleInterface {
  items: SafetyDepositDraft[]
}

const InstantSale = ({ items }: InstantSaleInterface) => {
  const connection = useConnection()
  const wallet = useWallet()
  const { whitelistedCreatorsByCreator, storeIndexer } = useMeta()

  const mint = useMint(QUOTE_MINT)
  const [auctionObj, setAuctionObj] = useState<
    | {
        vault: StringPublicKey
        auction: StringPublicKey
        auctionManager: StringPublicKey
      }
    | undefined
  >(undefined)
  const [attributes, setAttributes] = useState<AuctionState>({
    reservationPrice: 0,
    items,
    category: AuctionCategory.Open,
    auctionDurationType: 'minutes',
    gapTimeType: 'minutes',
    winnersCount: 1,
    startSaleTS: undefined,
    startListTS: undefined,
    quoteMintAddress: '',
    //@ts-ignore
    quoteMintInfo: undefined,
    //@ts-ignore
    quoteMintInfoExtended: undefined,
  })

  const [tieredAttributes, setTieredAttributes] = useState<TieredAuctionState>({
    items: [],
    tiers: [],
  })

  console.log('attributes', attributes)

  const createAuction = () => {
    console.log('hello')

    let winnerLimit: WinnerLimit
    //const mint = attributes.quoteMintInfo
    if (
      attributes.category === AuctionCategory.InstantSale &&
      attributes.instantSaleType === InstantSaleType.Open
    ) {
      const { items, instantSalePrice } = attributes

      if (items.length > 0 && items[0].participationConfig) {
        items[0].participationConfig.fixedPrice = new BN(toLamports(instantSalePrice, mint) || 0)
      }

      winnerLimit = new WinnerLimit({
        type: WinnerLimitType.Unlimited,
        usize: ZERO,
      })
    } else if (attributes.category === AuctionCategory.InstantSale) {
      const { items, editions } = attributes

      if (items.length > 0) {
        const item = items[0]
        if (!editions) {
          item.winningConfigType = WinningConfigType.TokenOnlyTransfer
        }

        item.amountRanges = [
          new AmountRange({
            amount: new BN(1),
            length: new BN(editions || 1),
          }),
        ]
      }

      winnerLimit = new WinnerLimit({
        type: WinnerLimitType.Capped,
        usize: new BN(editions || 1),
      })
    } else if (attributes.category === AuctionCategory.Open) {
      if (attributes.items.length > 0 && attributes.items[0].participationConfig) {
        attributes.items[0].participationConfig.fixedPrice = new BN(
          toLamports(attributes.participationFixedPrice, mint) || 0
        )
      }
      winnerLimit = new WinnerLimit({
        type: WinnerLimitType.Unlimited,
        usize: ZERO,
      })
    } else if (
      attributes.category === AuctionCategory.Limited ||
      attributes.category === AuctionCategory.Single
    ) {
      if (attributes.items.length > 0) {
        const item = attributes.items[0]
        if (attributes.category == AuctionCategory.Single && item.masterEdition) {
          item.winningConfigType = WinningConfigType.TokenOnlyTransfer
        }
        item.amountRanges = [
          new AmountRange({
            amount: new BN(1),
            length:
              attributes.category === AuctionCategory.Single
                ? new BN(1)
                : new BN(attributes.editions || 1),
          }),
        ]
      }
      winnerLimit = new WinnerLimit({
        type: WinnerLimitType.Capped,
        usize:
          attributes.category === AuctionCategory.Single
            ? new BN(1)
            : new BN(attributes.editions || 1),
      })

      if (attributes.participationNFT && attributes.participationNFT.participationConfig) {
        attributes.participationNFT.participationConfig.fixedPrice = new BN(
          toLamports(attributes.participationFixedPrice, mint) || 0
        )
      }
    } else {
      const tiers = tieredAttributes.tiers
      tiers.forEach(
        c => (c.items = c.items.filter(i => (i as TierDummyEntry).winningConfigType !== undefined))
      )
      const filteredTiers = tiers.filter(i => i.items.length > 0 && i.winningSpots.length > 0)

      tieredAttributes.items.forEach((config, index) => {
        let ranges: AmountRange[] = []
        filteredTiers.forEach(tier => {
          const tierRangeLookup: Record<number, AmountRange> = {}
          const tierRanges: AmountRange[] = []
          const item = tier.items.find(i => (i as TierDummyEntry).safetyDepositBoxIndex == index)

          if (item) {
            config.winningConfigType = (item as TierDummyEntry).winningConfigType
            const sorted = tier.winningSpots.sort()
            sorted.forEach((spot, i) => {
              if (tierRangeLookup[spot - 1]) {
                tierRangeLookup[spot] = tierRangeLookup[spot - 1]
                tierRangeLookup[spot].length = tierRangeLookup[spot].length.add(new BN(1))
              } else {
                tierRangeLookup[spot] = new AmountRange({
                  amount: new BN((item as TierDummyEntry).amount),
                  length: new BN(1),
                })
                // If the first spot with anything is winner spot 1, you want a section of 0 covering winning
                // spot 0.
                // If we have a gap, we want a gap area covered with zeroes.
                const zeroLength = i - 1 > 0 ? spot - sorted[i - 1] - 1 : spot
                if (zeroLength > 0) {
                  tierRanges.push(
                    new AmountRange({
                      amount: new BN(0),
                      length: new BN(zeroLength),
                    })
                  )
                }
                tierRanges.push(tierRangeLookup[spot])
              }
            })
            // Ok now we have combined ranges from this tier range. Now we merge them into the ranges
            // at the top level.
            const oldRanges = ranges
            ranges = []
            let oldRangeCtr = 0,
              tierRangeCtr = 0

            while (oldRangeCtr < oldRanges.length || tierRangeCtr < tierRanges.length) {
              let toAdd = new BN(0)
              if (
                tierRangeCtr < tierRanges.length &&
                tierRanges[tierRangeCtr].amount.gt(new BN(0))
              ) {
                toAdd = tierRanges[tierRangeCtr].amount
              }

              if (oldRangeCtr == oldRanges.length) {
                ranges.push(
                  new AmountRange({
                    amount: toAdd,
                    length: tierRanges[tierRangeCtr].length,
                  })
                )
                tierRangeCtr++
              } else if (tierRangeCtr == tierRanges.length) {
                ranges.push(oldRanges[oldRangeCtr])
                oldRangeCtr++
              } else if (oldRanges[oldRangeCtr].length.gt(tierRanges[tierRangeCtr].length)) {
                oldRanges[oldRangeCtr].length = oldRanges[oldRangeCtr].length.sub(
                  tierRanges[tierRangeCtr].length
                )

                ranges.push(
                  new AmountRange({
                    amount: oldRanges[oldRangeCtr].amount.add(toAdd),
                    length: tierRanges[tierRangeCtr].length,
                  })
                )

                tierRangeCtr += 1
                // dont increment oldRangeCtr since i still have length to give
              } else if (tierRanges[tierRangeCtr].length.gt(oldRanges[oldRangeCtr].length)) {
                tierRanges[tierRangeCtr].length = tierRanges[tierRangeCtr].length.sub(
                  oldRanges[oldRangeCtr].length
                )

                ranges.push(
                  new AmountRange({
                    amount: oldRanges[oldRangeCtr].amount.add(toAdd),
                    length: oldRanges[oldRangeCtr].length,
                  })
                )

                oldRangeCtr += 1
                // dont increment tierRangeCtr since they still have length to give
              } else if (tierRanges[tierRangeCtr].length.eq(oldRanges[oldRangeCtr].length)) {
                ranges.push(
                  new AmountRange({
                    amount: oldRanges[oldRangeCtr].amount.add(toAdd),
                    length: oldRanges[oldRangeCtr].length,
                  })
                )
                // Move them both in this degen case
                oldRangeCtr++
                tierRangeCtr++
              }
            }
          }
        })
        console.log('Ranges')
        config.amountRanges = ranges
      })

      winnerLimit = new WinnerLimit({
        type: WinnerLimitType.Capped,
        usize: new BN(attributes.winnersCount),
      })
      if (attributes.participationNFT && attributes.participationNFT.participationConfig) {
        attributes.participationNFT.participationConfig.fixedPrice = new BN(
          toLamports(attributes.participationFixedPrice, mint) || 0
        )
      }
      console.log('Tiered settings', tieredAttributes.items)
    }

    const isInstantSale =
      attributes.instantSalePrice && attributes.priceFloor === attributes.instantSalePrice

    const LAMPORTS_PER_TOKEN =
      attributes.quoteMintAddress == WRAPPED_SOL_MINT.toBase58()
        ? LAMPORTS_PER_SOL
        : Math.pow(10, attributes.quoteMintInfo.decimals || 0)

    const auctionSettings: IPartialCreateAuctionArgs = {
      winners: winnerLimit,
      endAuctionAt: isInstantSale
        ? null
        : new BN(
            (attributes.auctionDuration || 0) *
              (attributes.auctionDurationType == 'days'
                ? 60 * 60 * 24 // 1 day in seconds
                : attributes.auctionDurationType == 'hours'
                ? 60 * 60 // 1 hour in seconds
                : 60) // 1 minute in seconds
          ), // endAuctionAt is actually auction duration, poorly named, in seconds
      auctionGap: isInstantSale
        ? null
        : new BN(
            (attributes.gapTime || 0) *
              (attributes.gapTimeType == 'days'
                ? 60 * 60 * 24 // 1 day in seconds
                : attributes.gapTimeType == 'hours'
                ? 60 * 60 // 1 hour in seconds
                : 60) // 1 minute in seconds
          ),
      priceFloor: new PriceFloor({
        type: attributes.priceFloor ? PriceFloorType.Minimum : PriceFloorType.None,
        minPrice: new BN((attributes.priceFloor || 0) * LAMPORTS_PER_TOKEN),
      }),
      tokenMint: attributes.quoteMintAddress,
      gapTickSizePercentage: attributes.tickSizeEndingPhase || null,
      tickSize: attributes.priceTick ? new BN(attributes.priceTick * LAMPORTS_PER_TOKEN) : null,
      instantSalePrice: attributes.instantSalePrice
        ? new BN((attributes.instantSalePrice || 0) * LAMPORTS_PER_TOKEN)
        : null,
      name: null,
    }

    const isOpenEdition =
      attributes.category === AuctionCategory.Open ||
      attributes.instantSaleType === InstantSaleType.Open
    const safetyDepositDrafts = isOpenEdition
      ? []
      : attributes.category !== AuctionCategory.Tiered
      ? attributes.items
      : tieredAttributes.items
    const participationSafetyDepositDraft = isOpenEdition
      ? attributes.items[0]
      : attributes.participationNFT

    createAuctionManager(
      connection,
      wallet,
      whitelistedCreatorsByCreator,
      auctionSettings,
      safetyDepositDrafts,
      participationSafetyDepositDraft,
      attributes.quoteMintAddress,
      storeIndexer
    )
      .then(res => {
        console.log('res', res)
      })
      .catch(e => {
        console.log('error', e)
      })
  }
  return (
    <>
      <PutOnSale attributes={attributes} setAttributes={setAttributes} submit={createAuction} />
    </>
  )
}

export default InstantSale
