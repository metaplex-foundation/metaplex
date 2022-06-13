import { useEffect, useState } from 'react'
import { Spin } from 'antd'
import { notify, useConnection, useMeta, useMint } from '@oyster/common'
import { Button } from '@oyster/common'

import { useWallet } from '@solana/wallet-adapter-react'
import { SafetyDepositDraft } from '../../actions/createAuctionManager'
import { QUOTE_MINT } from '../../constants'
import { AuctionCategory, AuctionState, TieredAuctionState } from '../auctionCreate/types'
import PutOnSale from './PutOnSale'
import PutOnAuction from './PutOnAuction'
import { useHistory } from 'react-router-dom'
import { getListingByMint } from '../../api/ahListingApi'
import { listAuctionHouseNFT } from '../../actions/AuctionHouse'
import { useAhExtendedArt } from '../../hooks'

interface InstantSaleInterface {
  items: SafetyDepositDraft[]
  category: AuctionCategory
  setStatus: (status: number) => void
  status: number
  mintKey: string
  candyNft?: any
}

const InstantSale = ({
  items,
  category,
  setStatus,
  status,
  mintKey,
  candyNft,
}: InstantSaleInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const connection = useConnection()
  const wallet = useWallet()
  const { whitelistedCreatorsByCreator, storeIndexer } = useMeta()
  const history = useHistory()
  const [sale, setSale] = useState()

  const { data: extended } = useAhExtendedArt(items[0].metadata)

  console.log('extended', extended)

  const mint = useMint(QUOTE_MINT)
  // const [auctionObj, setAuctionObj] = useState<
  //   | {
  //       vault: StringPublicKey
  //       auction: StringPublicKey
  //       auctionManager: StringPublicKey
  //     }
  //   | undefined
  // >(undefined)
  const [attributes, setAttributes] = useState<AuctionState>({
    reservationPrice: 0,
    items: category === AuctionCategory.InstantSale ? items : [],
    category,
    auctionDurationType: 'minutes',
    participationNFT: category === AuctionCategory.Tiered ? items[0] : undefined,
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
  console.log('items1', items[0])

  console.log('attributes1', attributes)

  const [tieredAttributes, setTieredAttributes] = useState<TieredAuctionState>({
    items: [],
    tiers: [],
  })

  useEffect(() => {
    if (!!mintKey) {
      const fetchData = async () => {
        const sale = await getListingByMint(mintKey)
        if (!!sale) {
          setSale(sale)
        }
      }
      fetchData().catch(console.error)
    }
  }, [mintKey])

  const cancelListing = async () => {
    setLoading(true)
    await listAuctionHouseNFT(connection, wallet).onCancelListing(sale)
    setSale(undefined)
    setLoading(false)
    notify({
      message: 'Listing Cancelled',
    })
  }

  const createAuctionHouseSale = async () => {
    setLoading(true)

    const { instantSalePrice } = attributes
    const nft = items[0]

    nft['mintKey'] = mintKey

    const sale = await listAuctionHouseNFT(connection, wallet).onSell(
      instantSalePrice,
      nft,
      extended
    )
    setSale(sale)
    setLoading(false)
    notify({
      message: 'Listing added',
    })
  }

  const createAuction = () => {
    history.push(`/auction/create/instant/1/` + items?.[0]?.metadata?.pubkey)
    return
    // try {
    //   setStatus(PROCESSING)
    //   let winnerLimit: WinnerLimit
    //   //const mint = attributes.quoteMintInfo
    //   if (
    //     attributes.category === AuctionCategory.InstantSale &&
    //     attributes.instantSaleType === InstantSaleType.Open
    //   ) {
    //     const { items, instantSalePrice } = attributes

    //     if (items && items.length > 0 && items[0].participationConfig) {
    //       items[0].participationConfig.fixedPrice = new BN(toLamports(instantSalePrice, mint) || 0)
    //     }

    //     winnerLimit = new WinnerLimit({
    //       type: WinnerLimitType.Unlimited,
    //       usize: ZERO,
    //     })
    //   } else if (attributes.category === AuctionCategory.InstantSale) {
    //     const { items, editions } = attributes

    //     if (items.length > 0) {
    //       const item = items[0]
    //       if (!editions) {
    //         item.winningConfigType = WinningConfigType.TokenOnlyTransfer
    //       }

    //       item.amountRanges = [
    //         new AmountRange({
    //           amount: new BN(1),
    //           length: new BN(editions || 1),
    //         }),
    //       ]
    //     }

    //     winnerLimit = new WinnerLimit({
    //       type: WinnerLimitType.Capped,
    //       usize: new BN(editions || 1),
    //     })
    //   } else if (attributes.category === AuctionCategory.Open) {
    //     if (attributes.items.length > 0 && attributes.items[0].participationConfig) {
    //       attributes.items[0].participationConfig.fixedPrice = new BN(
    //         toLamports(attributes.participationFixedPrice, mint) || 0
    //       )
    //     }
    //     winnerLimit = new WinnerLimit({
    //       type: WinnerLimitType.Unlimited,
    //       usize: ZERO,
    //     })
    //   } else if (
    //     attributes.category === AuctionCategory.Limited ||
    //     attributes.category === AuctionCategory.Single
    //   ) {
    //     if (attributes.items.length > 0) {
    //       const item = attributes.items[0]
    //       if (attributes.category == AuctionCategory.Single && item.masterEdition) {
    //         item.winningConfigType = WinningConfigType.TokenOnlyTransfer
    //       }
    //       item.amountRanges = [
    //         new AmountRange({
    //           amount: new BN(1),
    //           length:
    //             attributes.category === AuctionCategory.Single
    //               ? new BN(1)
    //               : new BN(attributes.editions || 1),
    //         }),
    //       ]
    //     }
    //     winnerLimit = new WinnerLimit({
    //       type: WinnerLimitType.Capped,
    //       usize:
    //         attributes.category === AuctionCategory.Single
    //           ? new BN(1)
    //           : new BN(attributes.editions || 1),
    //     })

    //     if (attributes.participationNFT && attributes.participationNFT.participationConfig) {
    //       attributes.participationNFT.participationConfig.fixedPrice = new BN(
    //         toLamports(attributes.participationFixedPrice, mint) || 0
    //       )
    //     }
    //   } else {
    //     const tiers = tieredAttributes.tiers
    //     tiers.forEach(
    //       c =>
    //         (c.items = c.items.filter(i => (i as TierDummyEntry).winningConfigType !== undefined))
    //     )
    //     const filteredTiers = tiers.filter(i => i.items.length > 0 && i.winningSpots.length > 0)

    //     tieredAttributes.items.forEach((config, index) => {
    //       let ranges: AmountRange[] = []
    //       filteredTiers.forEach(tier => {
    //         const tierRangeLookup: Record<number, AmountRange> = {}
    //         const tierRanges: AmountRange[] = []
    //         const item = tier.items.find(i => (i as TierDummyEntry).safetyDepositBoxIndex == index)

    //         if (item) {
    //           config.winningConfigType = (item as TierDummyEntry).winningConfigType
    //           const sorted = tier.winningSpots.sort()
    //           sorted.forEach((spot, i) => {
    //             if (tierRangeLookup[spot - 1]) {
    //               tierRangeLookup[spot] = tierRangeLookup[spot - 1]
    //               tierRangeLookup[spot].length = tierRangeLookup[spot].length.add(new BN(1))
    //             } else {
    //               tierRangeLookup[spot] = new AmountRange({
    //                 amount: new BN((item as TierDummyEntry).amount),
    //                 length: new BN(1),
    //               })
    //               // If the first spot with anything is winner spot 1, you want a section of 0 covering winning
    //               // spot 0.
    //               // If we have a gap, we want a gap area covered with zeroes.
    //               const zeroLength = i - 1 > 0 ? spot - sorted[i - 1] - 1 : spot
    //               if (zeroLength > 0) {
    //                 tierRanges.push(
    //                   new AmountRange({
    //                     amount: new BN(0),
    //                     length: new BN(zeroLength),
    //                   })
    //                 )
    //               }
    //               tierRanges.push(tierRangeLookup[spot])
    //             }
    //           })
    //           // Ok now we have combined ranges from this tier range. Now we merge them into the ranges
    //           // at the top level.
    //           const oldRanges = ranges
    //           ranges = []
    //           let oldRangeCtr = 0,
    //             tierRangeCtr = 0

    //           while (oldRangeCtr < oldRanges.length || tierRangeCtr < tierRanges.length) {
    //             let toAdd = new BN(0)
    //             if (
    //               tierRangeCtr < tierRanges.length &&
    //               tierRanges[tierRangeCtr].amount.gt(new BN(0))
    //             ) {
    //               toAdd = tierRanges[tierRangeCtr].amount
    //             }

    //             if (oldRangeCtr == oldRanges.length) {
    //               ranges.push(
    //                 new AmountRange({
    //                   amount: toAdd,
    //                   length: tierRanges[tierRangeCtr].length,
    //                 })
    //               )
    //               tierRangeCtr++
    //             } else if (tierRangeCtr == tierRanges.length) {
    //               ranges.push(oldRanges[oldRangeCtr])
    //               oldRangeCtr++
    //             } else if (oldRanges[oldRangeCtr].length.gt(tierRanges[tierRangeCtr].length)) {
    //               oldRanges[oldRangeCtr].length = oldRanges[oldRangeCtr].length.sub(
    //                 tierRanges[tierRangeCtr].length
    //               )

    //               ranges.push(
    //                 new AmountRange({
    //                   amount: oldRanges[oldRangeCtr].amount.add(toAdd),
    //                   length: tierRanges[tierRangeCtr].length,
    //                 })
    //               )

    //               tierRangeCtr += 1
    //               // dont increment oldRangeCtr since i still have length to give
    //             } else if (tierRanges[tierRangeCtr].length.gt(oldRanges[oldRangeCtr].length)) {
    //               tierRanges[tierRangeCtr].length = tierRanges[tierRangeCtr].length.sub(
    //                 oldRanges[oldRangeCtr].length
    //               )

    //               ranges.push(
    //                 new AmountRange({
    //                   amount: oldRanges[oldRangeCtr].amount.add(toAdd),
    //                   length: oldRanges[oldRangeCtr].length,
    //                 })
    //               )

    //               oldRangeCtr += 1
    //               // dont increment tierRangeCtr since they still have length to give
    //             } else if (tierRanges[tierRangeCtr].length.eq(oldRanges[oldRangeCtr].length)) {
    //               ranges.push(
    //                 new AmountRange({
    //                   amount: oldRanges[oldRangeCtr].amount.add(toAdd),
    //                   length: oldRanges[oldRangeCtr].length,
    //                 })
    //               )
    //               // Move them both in this degen case
    //               oldRangeCtr++
    //               tierRangeCtr++
    //             }
    //           }
    //         }
    //       })

    //       config.amountRanges = ranges
    //     })

    //     winnerLimit = new WinnerLimit({
    //       type: WinnerLimitType.Capped,
    //       usize: new BN(attributes.winnersCount),
    //     })
    //     if (attributes.participationNFT && attributes.participationNFT.participationConfig) {
    //       attributes.participationNFT.participationConfig.fixedPrice = new BN(
    //         toLamports(attributes.participationFixedPrice, mint) || 0
    //       )
    //     }
    //   }

    //   const isInstantSale =
    //     attributes.instantSalePrice && attributes.priceFloor === attributes.instantSalePrice

    //   const LAMPORTS_PER_TOKEN =
    //     attributes.quoteMintAddress == WRAPPED_SOL_MINT.toBase58()
    //       ? LAMPORTS_PER_SOL
    //       : Math.pow(10, attributes.quoteMintInfo.decimals || 0)

    //   const auctionSettings: IPartialCreateAuctionArgs = {
    //     winners: winnerLimit,
    //     endAuctionAt: isInstantSale
    //       ? null
    //       : new BN(
    //           (attributes.auctionDuration || 0) *
    //             (attributes.auctionDurationType == 'days'
    //               ? 60 * 60 * 24 // 1 day in seconds
    //               : attributes.auctionDurationType == 'hours'
    //               ? 60 * 60 // 1 hour in seconds
    //               : 60) // 1 minute in seconds
    //         ), // endAuctionAt is actually auction duration, poorly named, in seconds
    //     auctionGap: isInstantSale
    //       ? null
    //       : new BN(
    //           (attributes.gapTime || 0) *
    //             (attributes.gapTimeType == 'days'
    //               ? 60 * 60 * 24 // 1 day in seconds
    //               : attributes.gapTimeType == 'hours'
    //               ? 60 * 60 // 1 hour in seconds
    //               : 60) // 1 minute in seconds
    //         ),
    //     priceFloor: new PriceFloor({
    //       type: attributes.priceFloor ? PriceFloorType.Minimum : PriceFloorType.None,
    //       minPrice: new BN((attributes.priceFloor || 0) * LAMPORTS_PER_TOKEN),
    //     }),
    //     tokenMint: attributes.quoteMintAddress,
    //     gapTickSizePercentage: attributes.tickSizeEndingPhase || null,
    //     tickSize: attributes.priceTick ? new BN(attributes.priceTick * LAMPORTS_PER_TOKEN) : null,
    //     instantSalePrice: attributes.instantSalePrice
    //       ? new BN((attributes.instantSalePrice || 0) * LAMPORTS_PER_TOKEN)
    //       : null,
    //     name: null,
    //   }

    //   const isOpenEdition =
    //     attributes.category === AuctionCategory.Open ||
    //     attributes.instantSaleType === InstantSaleType.Open
    //   const safetyDepositDrafts = isOpenEdition
    //     ? []
    //     : attributes.category !== AuctionCategory.Tiered
    //     ? attributes.items
    //     : tieredAttributes.items
    //   const participationSafetyDepositDraft = isOpenEdition
    //     ? attributes.items[0]
    //     : attributes.participationNFT
    //   console.log('-----------------------START--------------------------------------')
    //   console.log('connection', connection)
    //   console.log('------------------------------->2')
    //   console.log('wallet', wallet)
    //   console.log('------------------------------->3')
    //   console.log('whitelistedCreatorsByCreator', whitelistedCreatorsByCreator)
    //   console.log('------------------------------->4')
    //   console.log('auctionSettings', auctionSettings)
    //   console.log('------------------------------->5')
    //   console.log('safetyDepositDrafts', safetyDepositDrafts)
    //   console.log('------------------------------->6')
    //   console.log('participationSafetyDepositDraft', participationSafetyDepositDraft)
    //   console.log('------------------------------->7')
    //   console.log('attributes.quoteMintAddress', attributes.quoteMintAddress)
    //   console.log('------------------------------->8')
    //   console.log('storeIndexer', storeIndexer)
    //   console.log('-----------------------END--------------------------------------')

    //   createAuctionManager(
    //     connection,
    //     wallet,
    //     whitelistedCreatorsByCreator,
    //     auctionSettings,
    //     safetyDepositDrafts,
    //     participationSafetyDepositDraft,
    //     attributes.quoteMintAddress,
    //     storeIndexer
    //   )
    //     .then(res => {
    //       setStatus(SUCCESS)
    //       console.log('res', res)
    //     })
    //     .catch(error => {
    //       setStatus(ERROR)
    //       console.log('error', error)
    //     })
    // } catch (error) {
    //   setStatus(ERROR)
    //   console.log('error2', error)
    // }
  }

  const renderForm = () => {
    const category = attributes.category
    switch (category) {
      case AuctionCategory.InstantSale:
        if (!sale) {
          return <PutOnSale attributes={attributes} setAttributes={setAttributes} />
        }
        break
      case AuctionCategory.Tiered:
        return <></>
      // return <PutOnAuction attributes={attributes} setAttributes={setAttributes} />
      default:
        return <></>
    }
  }

  return (
    <>
      {renderForm()}
      <div className='mt-5 flex w-64 flex-auto items-center justify-start'>
        {category === AuctionCategory.InstantSale && !sale && (
          <Button disabled={loading} onClick={createAuctionHouseSale} className='w-full'>
            {loading ? <Spin /> : 'List Now'}
          </Button>
        )}
        {category === AuctionCategory.InstantSale && !!sale && (
          <Button disabled={loading} onClick={cancelListing} className='w-full'>
            {loading ? <Spin /> : 'End Sale'}
          </Button>
        )}
        {category === AuctionCategory.Tiered && !sale && (
          <>
            <div className='content flex w-full flex-col'>
              <div className='flex flex-col gap-[28px]'>
                <h6 className='text-h6 font-400'>Create Auction for this NFT</h6>
                <Button disabled={status} onClick={createAuction} className='w-full'>
                  Put on auction
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default InstantSale
