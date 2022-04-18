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

export default TierTableStep
