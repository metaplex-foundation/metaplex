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

export const AuctionCreateView = () => {
  const connection = useConnection()
  const wallet = useWallet()
  const { whitelistedCreatorsByCreator, storeIndexer } = useMeta()
  const { step_param }: { step_param: string } = useParams()
  const history = useHistory()
  const mint = useMint(QUOTE_MINT)
  const { width } = useWindowDimensions()

  const [step, setStep] = useState<number>(0)
  const [stepsVisible, setStepsVisible] = useState<boolean>(true)
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
    items: [],
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

  useEffect(() => {
    if (step_param) setStep(parseInt(step_param))
    else gotoNextStep(0)
  }, [step_param])

  const gotoNextStep = (_step?: number) => {
    const nextStep = _step === undefined ? step + 1 : _step
    history.push(`/auction/create/${nextStep.toString()}`)
  }

  const createAuction = async () => {
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

    const _auctionObj = await createAuctionManager(
      connection,
      wallet,
      whitelistedCreatorsByCreator,
      auctionSettings,
      safetyDepositDrafts,
      participationSafetyDepositDraft,
      attributes.quoteMintAddress,
      storeIndexer
    )
    setAuctionObj(_auctionObj)
  }

  const categoryStep = (
    <CategoryStep
      confirm={(category: AuctionCategory) => {
        setAttributes({
          ...attributes,
          category,
        })
        gotoNextStep()
      }}
    />
  )

  const instantSaleStep = (
    <InstantSaleStep
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  )

  const copiesStep = (
    <CopiesStep
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  )

  const winnersStep = (
    <NumberOfWinnersStep
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  )

  const priceAuction = (
    <PriceAuction
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  )

  const initialStep = (
    <InitialPhaseStep
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  )

  const endingStep = (
    <EndingPhaseAuction
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  )

  const participationStep = (
    <ParticipationStep
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  )

  const tierTableStep = (
    <TierTableStep
      attributes={tieredAttributes}
      setAttributes={setTieredAttributes}
      maxWinners={attributes.winnersCount}
      confirm={() => gotoNextStep()}
    />
  )

  const reviewStep = (
    <ReviewStep
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => {
        setStepsVisible(false)
        gotoNextStep()
      }}
      connection={connection}
    />
  )

  const waitStep = <WaitingStep createAuction={createAuction} confirm={() => gotoNextStep()} />

  const congratsStep = <Congrats auction={auctionObj} />

  const stepsByCategory = {
    [AuctionCategory.InstantSale]: [
      ['Category', categoryStep],
      ['Instant Sale', instantSaleStep],
      ['Review', reviewStep],
      ['Publish', waitStep],
      [undefined, congratsStep],
    ],
    [AuctionCategory.Limited]: [
      ['Category', categoryStep],
      ['Copies', copiesStep],
      ['Price', priceAuction],
      ['Initial Phase', initialStep],
      ['Ending Phase', endingStep],
      ['Participation NFT', participationStep],
      ['Review', reviewStep],
      ['Publish', waitStep],
      [undefined, congratsStep],
    ],
    [AuctionCategory.Single]: [
      ['Category', categoryStep],
      ['Copies', copiesStep],
      ['Price', priceAuction],
      ['Initial Phase', initialStep],
      ['Ending Phase', endingStep],
      ['Participation NFT', participationStep],
      ['Review', reviewStep],
      ['Publish', waitStep],
      [undefined, congratsStep],
    ],
    [AuctionCategory.Open]: [
      ['Category', categoryStep],
      ['Copies', copiesStep],
      ['Price', priceAuction],
      ['Initial Phase', initialStep],
      ['Ending Phase', endingStep],
      ['Review', reviewStep],
      ['Publish', waitStep],
      [undefined, congratsStep],
    ],
    [AuctionCategory.Tiered]: [
      ['Category', categoryStep],
      ['Winners', winnersStep],
      ['Tiers', tierTableStep],
      ['Price', priceAuction],
      ['Initial Phase', initialStep],
      ['Ending Phase', endingStep],
      ['Participation NFT', participationStep],
      ['Review', reviewStep],
      ['Publish', waitStep],
      [undefined, congratsStep],
    ],
  }

  return (
    <>
      <div className='flex w-full pt-[80px] pb-[100px]'>
        <div className='container flex gap-[32px]'>
          {stepsVisible && (
            <div className='sidebar w-[260px] flex-shrink-0 rounded'>
              <Steps progressDot direction={width < 768 ? 'horizontal' : 'vertical'} current={step}>
                {stepsByCategory[attributes.category]
                  .filter(_ => !!_[0])
                  .map((step, idx) => (
                    <Step title={step[0]} key={idx} />
                  ))}
              </Steps>
            </div>
          )}

          <div className='content-wrapper flex w-full flex-col gap-[28px]'>
            {stepsByCategory[attributes.category][step][1]}

            {0 < step && stepsVisible && (
              <div className='flex max-w-[700px]'>
                <Button
                  appearance='secondary'
                  view='outline'
                  isRounded={false}
                  onClick={() => gotoNextStep(step - 1)}>
                  Back
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

const CategoryStep = (props: { confirm: (category: AuctionCategory) => void }) => {
  const { width } = useWindowDimensions()
  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[12px]'>
          <h2 className='text-h3'>List an item</h2>
          <p className='text-md'>
            First time listing on Metaplex?{' '}
            <a href='#' target='_blank' rel='noreferrer' className='text-B-500'>
              Read our sellers guide.
            </a>
          </p>
        </div>
      </div>

      <div className='flex max-w-[700px] flex-col gap-[12px]'>
        <Button
          appearance='neutral'
          isRounded={false}
          className='!h-[60px]'
          onClick={() => props.confirm(AuctionCategory.InstantSale)}>
          <div>
            <div>Instant Sale</div>
            <div className='type-btn-description font-400 normal-case'>
              At a fixed price, sell a single Master NFT or copies of it
            </div>
          </div>
        </Button>

        <Button
          appearance='neutral'
          isRounded={false}
          className='!h-[60px]'
          onClick={() => props.confirm(AuctionCategory.Limited)}>
          <div>
            <div>Limited Edition</div>
            <div className='type-btn-description font-400 normal-case'>
              Sell a limited copy or copies of a single Master NFT
            </div>
          </div>
        </Button>

        <Button
          appearance='neutral'
          isRounded={false}
          className='!h-[60px]'
          onClick={() => props.confirm(AuctionCategory.Open)}>
          <div>
            <div>Open Edition</div>
            <div className='type-btn-description font-400 normal-case'>
              Sell unlimited copies of a single Master NFT
            </div>
          </div>
        </Button>

        <Button
          appearance='neutral'
          isRounded={false}
          className='!h-[60px]'
          onClick={() => props.confirm(AuctionCategory.Tiered)}>
          <div>
            <div>Tiered Auction</div>
            <div className='type-btn-description font-400 normal-case'>
              Participants get unique rewards based on their leaderboard rank
            </div>
          </div>
        </Button>

        <Button
          appearance='neutral'
          isRounded={false}
          className='!h-[60px]'
          onClick={() => props.confirm(AuctionCategory.Single)}>
          <div>
            <div>Sell an Existing Item</div>
            <div className='type-btn-description font-400 normal-case'>
              Sell an existing item in your NFT collection, including Master NFTs
            </div>
          </div>
        </Button>
      </div>
    </>
  )
}

const InstantSaleStep = ({
  attributes,
  setAttributes,
  confirm,
}: {
  attributes: AuctionState
  setAttributes: (attr: AuctionState) => void
  confirm: () => void
}) => {
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [mint, setMint] = useState<PublicKey>(WRAPPED_SOL_MINT)
  // give default value to mint

  const { hasOtherTokens, tokenMap } = useTokenList()

  // give default value to mint
  const mintInfo = tokenMap.get(!mint ? QUOTE_MINT.toString() : mint.toString())

  attributes.quoteMintAddress = mint ? mint.toBase58() : QUOTE_MINT.toBase58()

  if (attributes.quoteMintAddress) {
    attributes.quoteMintInfo = useMint(attributes.quoteMintAddress)!
    attributes.quoteMintInfoExtended = useTokenList().tokenMap.get(attributes.quoteMintAddress)!
  }

  //console.log("OBJ MINT", mint.toBase58())
  const isMasterEdition = !!attributes?.items?.[0]?.masterEdition

  const copiesEnabled = useMemo(() => {
    const maxSupply = attributes?.items?.[0]?.masterEdition?.info?.maxSupply
    return !!maxSupply && maxSupply.toNumber() > 0
  }, [attributes?.items?.[0]])
  const artistFilter = useCallback(
    (i: SafetyDepositDraft) =>
      !(i.metadata.info.data.creators || []).some((c: Creator) => !c.verified),
    []
  )

  const isLimitedEdition = attributes.instantSaleType === InstantSaleType.Limited
  const shouldRenderSelect = attributes.items.length > 0

  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[8px]'>
          <h2 className='text-h3'>Select which item to sell:</h2>
        </div>
      </div>

      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex w-full'>
          <ArtSelector
            filter={artistFilter}
            selected={attributes.items}
            setSelected={items => {
              setAttributes({ ...attributes, items })
            }}
            allowMultiple={false}>
            Select NFT
          </ArtSelector>
        </div>

        {shouldRenderSelect && (
          <div className='flex'>
            <label className='action-field'>
              <Select
                defaultValue={attributes.instantSaleType || InstantSaleType.Single}
                onChange={value =>
                  setAttributes({
                    ...attributes,
                    instantSaleType: value,
                  })
                }>
                <Option value={InstantSaleType.Single}>Sell unique token</Option>
                {copiesEnabled && (
                  <Option value={InstantSaleType.Limited}>Sell limited number of copies</Option>
                )}
                {!copiesEnabled && isMasterEdition && (
                  <Option value={InstantSaleType.Open}>Sell unlimited number of copies</Option>
                )}
              </Select>
              {isLimitedEdition && (
                <>
                  <span className='field-info'>
                    Each copy will be given unique edition number e.g. 1 of 30
                  </span>
                  <Input
                    autoFocus
                    className='input'
                    placeholder='Enter number of copies sold'
                    allowClear
                    onChange={info =>
                      setAttributes({
                        ...attributes,
                        editions: parseInt(info.target.value),
                      })
                    }
                  />
                </>
              )}
            </label>
          </div>
        )}

        {hasOtherTokens && (
          <div className='flex flex-col gap-[16px]'>
            <div className='flex flex-col gap-[8px]'>
              <h6 className='text-h6'>Auction mint</h6>
            </div>

            <div className='flex flex-col'>
              <TokenButton mint={mint} onClick={() => setShowTokenDialog(true)} />
              <TokenDialog
                setMint={setMint}
                open={showTokenDialog}
                onClose={() => {
                  setShowTokenDialog(false)
                }}
              />
            </div>
          </div>
        )}

        <div className='flex flex-col gap-[16px]'>
          <div className='flex flex-col gap-[8px]'>
            <h6 className='text-h6'>Price</h6>
            <p>This is the instant sale price for your item.</p>
          </div>

          <div className='flex'>
            <TextField
              type='number'
              min={0}
              autoFocus
              placeholder='Price'
              label='Enter price'
              onChange={info =>
                setAttributes({
                  ...attributes,
                  priceFloor: parseFloat(info.target.value),
                  instantSalePrice: parseFloat(info.target.value),
                })
              }
              iconBefore={'◎'}
              iconAfter={mintInfo?.symbol || 'CUSTOM'}
            />
          </div>
        </div>

        <div className='flex items-center'>
          <Button
            appearance='neutral'
            size='lg'
            isRounded={false}
            onClick={() => {
              confirm()
            }}>
            Continue
          </Button>
        </div>
      </div>
    </>
  )
}

const CopiesStep = (props: {
  attributes: AuctionState
  setAttributes: (attr: AuctionState) => void
  confirm: () => void
}) => {
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [mint, setMint] = useState<PublicKey>(WRAPPED_SOL_MINT)
  const { hasOtherTokens } = useTokenList()

  props.attributes.quoteMintAddress = mint ? mint.toBase58() : QUOTE_MINT.toBase58()

  if (props.attributes.quoteMintAddress) {
    props.attributes.quoteMintInfo = useMint(props.attributes.quoteMintAddress)!
    props.attributes.quoteMintInfoExtended = useTokenList().tokenMap.get(
      props.attributes.quoteMintAddress
    )!
  }

  const artistFilter = (i: SafetyDepositDraft) =>
    !(i.metadata.info.data.creators || []).find((c: Creator) => !c.verified)
  let filter: (i: SafetyDepositDraft) => boolean = () => true
  if (props.attributes.category === AuctionCategory.Limited) {
    filter = (i: SafetyDepositDraft) => !!i.masterEdition && !!i.masterEdition.info.maxSupply
  } else if (props.attributes.category === AuctionCategory.Open) {
    filter = (i: SafetyDepositDraft) =>
      !!(
        i.masterEdition &&
        (i.masterEdition.info.maxSupply === undefined || i.masterEdition.info.maxSupply === null)
      )
  }

  const overallFilter = (i: SafetyDepositDraft) => filter(i) && artistFilter(i)

  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[8px]'>
          <h2 className='text-h3'>Select which item to sell:</h2>
          <p>Select the item(s) that you want to list.</p>
        </div>
      </div>

      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex'>
          <ArtSelector
            filter={overallFilter}
            selected={props.attributes.items}
            setSelected={items => {
              props.setAttributes({ ...props.attributes, items })
            }}
            allowMultiple={false}>
            Select NFT
          </ArtSelector>
        </div>

        {hasOtherTokens && (
          <div className='flex flex-col gap-[16px]'>
            <h6 className='text-h6'>Auction mint</h6>

            <div className='flex flex-col'>
              <TokenButton mint={mint} onClick={() => setShowTokenDialog(true)} />
              <TokenDialog
                setMint={setMint}
                open={showTokenDialog}
                onClose={() => {
                  setShowTokenDialog(false)
                }}
              />
            </div>
          </div>
        )}

        {props.attributes.category === AuctionCategory.Limited && (
          <div className='flex flex-col gap-[16px]'>
            <div className='flex flex-col gap-[8px]'>
              <h6 className='text-h6'>How many copies do you want to create?</h6>
              <p>Each copy will be given unique edition number e.g. 1 of 30.</p>
            </div>

            <div className='flex'>
              <TextField
                autoFocus
                type='number'
                placeholder='Enter number of copies sold'
                allowClear
                label='Number of copies'
                onChange={info =>
                  props.setAttributes({
                    ...props.attributes,
                    editions: parseInt(info.target.value),
                  })
                }
              />
            </div>
          </div>
        )}

        <div className='flex items-center'>
          <Button
            appearance='neutral'
            size='lg'
            isRounded={false}
            onClick={() => {
              props.confirm()
            }}>
            Continue to Terms
          </Button>
        </div>
      </div>
    </>
  )
}

const NumberOfWinnersStep = (props: {
  attributes: AuctionState
  setAttributes: (attr: AuctionState) => void
  confirm: () => void
}) => {
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [mint, setMint] = useState<PublicKey>(WRAPPED_SOL_MINT)
  const { hasOtherTokens } = useTokenList()

  props.attributes.quoteMintAddress = mint ? mint.toBase58() : QUOTE_MINT.toBase58()

  if (props.attributes.quoteMintAddress) {
    props.attributes.quoteMintInfo = useMint(props.attributes.quoteMintAddress)!
    props.attributes.quoteMintInfoExtended = useTokenList().tokenMap.get(
      props.attributes.quoteMintAddress
    )!
  }

  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[8px]'>
          <h2 className='text-h3'>Tiered Auction</h2>
          <p>Create a Tiered Auction</p>
          <p></p>
        </div>
      </div>

      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[16px]'>
          <div className='flex flex-col gap-[8px]'>
            <h6 className='text-h6'>How many participants can win the auction?</h6>
            <p>This is the number of spots in the leaderboard.</p>
          </div>

          <div className='flex'>
            <TextField
              type='number'
              autoFocus
              className='input'
              placeholder='Number of spots in the leaderboard'
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  winnersCount: parseInt(info.target.value),
                })
              }
            />
          </div>
        </div>

        {hasOtherTokens && (
          <div className='flex flex-col gap-[16px]'>
            <div className='flex flex-col gap-[8px]'>
              <h6 className='text-h6'>Auction mint</h6>
              <p>This will be the quote mint for your auction.</p>
            </div>

            <div className='flex flex-col'>
              <TokenButton mint={mint} onClick={() => setShowTokenDialog(true)} />
              <TokenDialog
                setMint={setMint}
                open={showTokenDialog}
                onClose={() => {
                  setShowTokenDialog(false)
                }}
              />
            </div>
          </div>
        )}

        <div className='flex items-center'>
          <Button appearance='neutral' size='lg' isRounded={false} onClick={props.confirm}>
            Continue
          </Button>
        </div>
      </div>
    </>
  )
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
          <h2 className='text-h3'>Initial Phase</h2>
          <p>Set the terms for your auction.</p>
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

      <div className='flex items-center'>
        <Button appearance='neutral' size='lg' isRounded={false} onClick={props.confirm}>
          Continue
        </Button>
      </div>
    </>
  )
}

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

const TierTableStep = (props: {
  attributes: TieredAuctionState
  setAttributes: (attr: TieredAuctionState) => void
  maxWinners: number
  confirm: () => void
}) => {
  const newImmutableTiers = (tiers: Tier[]) => {
    return tiers.map(wc => ({
      items: [...wc.items.map(it => ({ ...it }))],
      winningSpots: [...wc.winningSpots],
    }))
  }
  const artistFilter = (i: SafetyDepositDraft) =>
    !(i.metadata.info.data.creators || []).find((c: Creator) => !c.verified)
  const options: { label: string; value: number }[] = []
  for (let i = 0; i < props.maxWinners; i++) {
    options.push({ label: `Winner ${i + 1}`, value: i })
  }
  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[8px]'>
          <h2 className='text-h3'>Add Winning Tiers and Their Prizes</h2>
          <p>Each row represents a tier. You can choose which winning spots get which tiers.</p>
        </div>
      </div>

      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex w-full flex-col gap-[20px]'>
          {props.attributes.tiers.map((wcg, configIndex) => (
            <div
              key={configIndex}
              className='flex w-full flex-col gap-[16px] rounded border border-slate-200 px-[20px] py-[20px]'>
              <div className='flex justify-between'>
                <div className='flex flex-col gap-[8px]'>
                  <h6 className='text-h6'>Tier #{configIndex + 1} Basket</h6>
                  <Checkbox.Group
                    options={options}
                    onChange={value => {
                      const newTiers = newImmutableTiers(props.attributes.tiers)
                      const myNewTier = newTiers[configIndex]
                      myNewTier.winningSpots = value.map(i => i.valueOf() as number)

                      props.setAttributes({
                        ...props.attributes,
                        tiers: newTiers,
                      })
                    }}
                  />
                </div>

                <Button
                  appearance='secondary'
                  view='outline'
                  onClick={() => {
                    const newTiers = newImmutableTiers(props.attributes.tiers)
                    const myNewTier = newTiers[configIndex]
                    myNewTier.items.push({})
                    props.setAttributes({
                      ...props.attributes,
                      tiers: newTiers,
                    })
                  }}
                  iconBefore={<PlusCircleOutlined />}>
                  Add an NFT
                </Button>
              </div>

              <div className='grid w-full grid-cols-3 gap-[16px]'>
                {wcg.items.map((i, itemIndex) => (
                  <div key={itemIndex} className='flex w-full flex-col gap-[16px]'>
                    <div className='flex w-full'>
                      <ArtSelector
                        filter={artistFilter}
                        className='!w-full'
                        selected={
                          (i as TierDummyEntry).safetyDepositBoxIndex !== undefined
                            ? [props.attributes.items[(i as TierDummyEntry).safetyDepositBoxIndex]]
                            : []
                        }
                        setSelected={items => {
                          const newItems = [...props.attributes.items.map(it => ({ ...it }))]

                          const newTiers = newImmutableTiers(props.attributes.tiers)
                          if (items[0]) {
                            const existing = props.attributes.items.find(
                              it => it.metadata.pubkey === items[0].metadata.pubkey
                            )
                            if (!existing) newItems.push(items[0])
                            const index = newItems.findIndex(
                              it => it.metadata.pubkey === items[0].metadata.pubkey
                            )

                            const myNewTier = newTiers[configIndex].items[itemIndex]
                            myNewTier.safetyDepositBoxIndex = index
                            if (
                              items[0].masterEdition &&
                              items[0].masterEdition.info.key == MetadataKey.MasterEditionV1
                            ) {
                              myNewTier.winningConfigType = WinningConfigType.PrintingV1
                            } else if (
                              items[0].masterEdition &&
                              items[0].masterEdition.info.key == MetadataKey.MasterEditionV2
                            ) {
                              myNewTier.winningConfigType = WinningConfigType.PrintingV2
                            } else {
                              myNewTier.winningConfigType = WinningConfigType.TokenOnlyTransfer
                            }
                            myNewTier.amount = 1
                          } else if ((i as TierDummyEntry).safetyDepositBoxIndex !== undefined) {
                            const myNewTier = newTiers[configIndex]
                            myNewTier.items.splice(itemIndex, 1)
                            if (myNewTier.items.length === 0) newTiers.splice(configIndex, 1)
                            const othersWithSameItem = newTiers.find(c =>
                              c.items.find(
                                it =>
                                  it.safetyDepositBoxIndex ===
                                  (i as TierDummyEntry).safetyDepositBoxIndex
                              )
                            )

                            if (!othersWithSameItem) {
                              for (
                                let j = (i as TierDummyEntry).safetyDepositBoxIndex + 1;
                                j < props.attributes.items.length;
                                j++
                              ) {
                                newTiers.forEach(c =>
                                  c.items.forEach(it => {
                                    if (it.safetyDepositBoxIndex === j) it.safetyDepositBoxIndex--
                                  })
                                )
                              }
                              newItems.splice((i as TierDummyEntry).safetyDepositBoxIndex, 1)
                            }
                          }

                          props.setAttributes({
                            ...props.attributes,
                            items: newItems,
                            tiers: newTiers,
                          })
                        }}
                        allowMultiple={false}>
                        Select item
                      </ArtSelector>
                    </div>

                    <div className='flex w-full flex-col gap-[8px]'>
                      {(i as TierDummyEntry).winningConfigType !== undefined && (
                        <>
                          <Select
                            className='w-full'
                            defaultValue={(i as TierDummyEntry).winningConfigType}
                            style={{ width: 120 }}
                            onChange={value => {
                              const newTiers = newImmutableTiers(props.attributes.tiers)

                              const myNewTier = newTiers[configIndex].items[itemIndex]

                              // Legacy hack...
                              if (
                                value == WinningConfigType.PrintingV2 &&
                                myNewTier.safetyDepositBoxIndex &&
                                props.attributes.items[myNewTier.safetyDepositBoxIndex]
                                  .masterEdition?.info.key == MetadataKey.MasterEditionV1
                              ) {
                                value = WinningConfigType.PrintingV1
                              }
                              myNewTier.winningConfigType = value
                              props.setAttributes({
                                ...props.attributes,
                                tiers: newTiers,
                              })
                            }}>
                            <Option value={WinningConfigType.FullRightsTransfer}>
                              Full Rights Transfer
                            </Option>
                            <Option value={WinningConfigType.TokenOnlyTransfer}>
                              Token Only Transfer
                            </Option>
                            <Option value={WinningConfigType.PrintingV2}>Printing V2</Option>

                            <Option value={WinningConfigType.PrintingV1}>Printing V1</Option>
                          </Select>

                          {((i as TierDummyEntry).winningConfigType ===
                            WinningConfigType.PrintingV1 ||
                            (i as TierDummyEntry).winningConfigType ===
                              WinningConfigType.PrintingV2) && (
                            <>
                              <div className='flex flex-col gap-[16px]'>
                                <div className='flex flex-col gap-[8px]'>
                                  <p className='text-sm'>
                                    How many copies do you want to create for each winner? If you
                                    put 2, then each winner will get 2 copies.
                                  </p>
                                  <p className='text-sm'>
                                    Each copy will be given unique edition number e.g. 1 of 30
                                  </p>
                                </div>

                                <div className='flex'>
                                  <TextField
                                    label='No# of copies'
                                    autoFocus
                                    className='input'
                                    placeholder='Enter number of copies sold'
                                    allowClear
                                    onChange={info => {
                                      const newTiers = newImmutableTiers(props.attributes.tiers)

                                      const myNewTier = newTiers[configIndex].items[itemIndex]
                                      myNewTier.amount = parseInt(info.target.value)
                                      props.setAttributes({
                                        ...props.attributes,
                                        tiers: newTiers,
                                      })
                                    }}
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className='flex w-full items-center gap-[8px]'>
          <Button
            appearance='secondary'
            view='outline'
            size='lg'
            isRounded={false}
            onClick={() => {
              const newTiers = newImmutableTiers(props.attributes.tiers)
              newTiers.push({ items: [], winningSpots: [] })
              props.setAttributes({
                ...props.attributes,
                tiers: newTiers,
              })
            }}
            iconBefore={<PlusCircleOutlined />}>
            Add another Tier
          </Button>

          <Button appearance='neutral' size='lg' isRounded={false} onClick={props.confirm}>
            Continue to Review
          </Button>
        </div>
      </div>
    </>
  )
}

const ParticipationStep = (props: {
  attributes: AuctionState
  setAttributes: (attr: AuctionState) => void
  confirm: () => void
}) => {
  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[8px]'>
          <h2 className='text-h3'>Participation NFT</h2>
          <p>Provide NFT that will be awarded as an Open Edition NFT for auction participation.</p>
        </div>
      </div>

      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex w-full'>
          <ArtSelector
            filter={(i: SafetyDepositDraft) =>
              !!i.masterEdition && i.masterEdition.info.maxSupply === undefined
            }
            selected={props.attributes.participationNFT ? [props.attributes.participationNFT] : []}
            setSelected={items => {
              props.setAttributes({
                ...props.attributes,
                participationNFT: items[0],
              })
            }}
            allowMultiple={false}>
            Select Participation NFT
          </ArtSelector>
        </div>

        <div className='flex flex-col gap-[16px]'>
          <div className='flex flex-col gap-[8px]'>
            <h6 className='text-h6'>Price</h6>
            <p>
              This is an optional fixed price that non-winners will pay for your Participation NFT.
            </p>
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
                  participationFixedPrice: parseFloat(info.target.value),
                })
              }
            />
          </div>
        </div>

        <div className='flex items-center'>
          <Button appearance='neutral' size='lg' isRounded={false} onClick={props.confirm}>
            Continue to Review
          </Button>
        </div>
      </div>
    </>
  )
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

const Congrats = (props: {
  auction?: {
    vault: StringPublicKey
    auction: StringPublicKey
    auctionManager: StringPublicKey
  }
}) => {
  const history = useHistory()

  const newTweetURL = () => {
    const params = {
      text: "I've created a new NFT auction on Metaplex, check it out!",
      url: `${window.location.origin}/#/auction/${props.auction?.auction.toString()}`,
      hashtags: 'NFT,Crypto,Metaplex',
      // via: "Metaplex",
      related: 'Metaplex,Solana',
    }
    const queryParams = new URLSearchParams(params).toString()
    return `https://twitter.com/intent/tweet?${queryParams}`
  }

  return (
    <>
      <div className='flex w-full flex-col justify-center gap-[40px]'>
        <h1 className='text-center text-display-md'>
          Congratulations!
          <br />
          Your auction is now live.
        </h1>

        <div className='flex flex-col items-center justify-center gap-[16px]'>
          <div className='inline-flex'>
            <Button
              appearance='neutral'
              className='w-[260px]'
              isRounded={false}
              iconAfter={<i className='ri-arrow-right-s-line' />}
              onClick={() => window.open(newTweetURL(), '_blank')}>
              Share it on Twitter
            </Button>
          </div>

          <div className='inline-flex'>
            <Button
              appearance='primary'
              className='w-[260px]'
              isRounded={false}
              iconAfter={<i className='ri-arrow-right-s-line' />}
              onClick={() => {
                history.push(`/`)
                history.go(0)
              }}>
              See it in your auctions
            </Button>
          </div>
        </div>
      </div>
      <Confetti />
    </>
  )
}
