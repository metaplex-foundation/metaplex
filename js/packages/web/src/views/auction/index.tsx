import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Carousel, Col, List, Row, Skeleton } from 'antd'
import { AuctionCard } from '../../components/AuctionCard'
import { Connection } from '@solana/web3.js'
import { AuctionViewItem } from '@oyster/common/dist/lib/models/metaplex/index'
import {
  AuctionView as Auction,
  useArt,
  useAuction,
  useBidsForAuction,
  useCreators,
  useExtendedArt,
} from '../../hooks'
import { ArtContent } from '../../components/ArtContent'

import { TabHighlightButton } from '../../components-v2/atoms/TabHighlightButton'
import { NftDetailsTab } from '../../components-v2/sections/NftDetailsTab'
import { NftActivityTable } from '../../components-v2/sections/NftActivityTable'
import { NftOffersTable } from '../../components-v2/sections/NftOffersTable'
import RightIcon from '../../components-v2/icons/Right'
import LeftIcon from '../../components-v2/icons/Left'
import Spinner from '../../components-v2/icons/Spinner'

import { format } from 'timeago.js'

import {
  AuctionState,
  formatTokenAmount,
  Identicon,
  MetaplexModal,
  shortenAddress,
  StringPublicKey,
  toPublicKey,
  useConnection,
  useConnectionConfig,
  useMint,
  useMeta,
  PriceFloorType,
  BidStateType,
  Button,
} from '@oyster/common'
import { useWallet } from '@solana/wallet-adapter-react'
import { MintInfo } from '@solana/spl-token'
import { getHandleAndRegistryKey } from '@solana/spl-name-service'
import useWindowDimensions from '../../utils/layout'
import { CheckOutlined } from '@ant-design/icons'
import { ArtType } from '../../types'
import { MetaAvatar, MetaAvatarDetailed } from '../../components/MetaAvatar'
import { AmountLabel } from '../../components/AmountLabel'
import { ClickToCopy } from '../../components/ClickToCopy'
import { useTokenList } from '../../contexts/tokenList'
import { useAuctionStatus } from '../../components/AuctionRenderCard/hooks/useAuctionStatus'

export const AuctionItem = ({
  item,
  index,
  size,
  active,
}: {
  item: AuctionViewItem
  index: number
  size: number
  active?: boolean
}) => {
  const id = item.metadata.pubkey
  const style: React.CSSProperties = {
    transform:
      index === 0
        ? ''
        : `translate(${index * 15}px, ${-40 * index}px) scale(${Math.max(1 - 0.2 * index, 0)})`,
    transformOrigin: 'right bottom',
    position: index !== 0 ? 'absolute' : 'static',
    zIndex: -1 * index,
    marginLeft: size > 1 && index === 0 ? '0px' : 'auto',
    background: 'black',
    boxShadow: 'rgb(0 0 0 / 10%) 12px 2px 20px 14px',
    aspectRatio: '1/1',
  }
  return (
    <ArtContent
      pubkey={id}
      className='artwork-image stack-item'
      style={style}
      active={active}
      allowMeshRender={true}
    />
  )
}

const PriceView = auction => {
  let { status, amount } = useAuctionStatus(auction)

  return (
    <div className='mb-[20px] flex flex-col'>
      <label className='mb-[4px] text-h6 text-gray-800'>Current price</label>

      <div className='flex items-center gap-[4px]'>
        <i className='ri-price-tag-3-fill text-lg text-B-400' />
        <span className='mr-[8px] text-lg font-500 text-gray-800'>{amount}</span>
        <span className='text-base text-gray-500'>$20.00</span>
      </div>
    </div>
  )
}

export const AuctionView = () => {
  const { width } = useWindowDimensions()
  const { id } = useParams<{ id: string }>()
  const { endpoint } = useConnectionConfig()
  const auction = useAuction(id)
  const [currentIndex, setCurrentIndex] = useState(0)
  const art = useArt(auction?.thumbnail.metadata.pubkey)
  const { ref, data } = useExtendedArt(auction?.thumbnail.metadata.pubkey)
  const creators = useCreators(auction)
  const [activeTab, setActiveTab] = useState('activity')
  // const { pullAuctionPage } = useMeta()
  // useEffect(() => {
  //   pullAuctionPage(id)
  // }, [])
  let edition = ''
  if (art.type === ArtType.NFT) {
    edition = 'Unique'
  } else if (art.type === ArtType.Master) {
    edition = 'NFT 0'
  } else if (art.type === ArtType.Print) {
    edition = `${art.edition} of ${art.supply}`
  }
  const nftCount = auction?.items.flat().length
  const winnerCount = auction?.items.length
  const isOpen = auction?.auction.info.bidState.type === BidStateType.OpenEdition
  const hasDescription = data === undefined || data.description === undefined
  const description = data?.description
  const attributes = data?.attributes
  const url = data?.image

  const tokenInfo = useTokenList()?.subscribedTokens.filter(
    m => m.address == auction?.auction.info.tokenMint
  )[0]
  // if (auction) {
  //   let { status, amount } = useAuctionStatus(auction)
  // }

  // const myPayingAccount = balance.accounts[0]
  // const instantSalePrice = useMemo(
  //   () => auction?.auctionDataExtended?.info.instantSalePrice,
  //   [auction?.auctionDataExtended]
  // )

  const items = [
    ...(auction?.items
      .flat()
      .reduce((agg, item) => {
        agg.set(item.metadata.pubkey, item)
        return agg
      }, new Map<string, AuctionViewItem>())
      .values() || []),
    auction?.participationItem,
  ].map((item, index, arr) => {
    if (!item || !item?.metadata || !item.metadata?.pubkey) {
      return null
    }

    return (
      <AuctionItem
        key={item.metadata.pubkey}
        item={item}
        index={index}
        size={arr.length}
        active={index === currentIndex}
      />
    )
  })

  return (
    <>
      <div className='container py-[40px] lg:py-[80px]'>
        <div className='flex w-full'>
          <div className='flex h-[300px] w-[300px] flex-shrink-0 overflow-hidden rounded-[8px] bg-gray-100'>
            <img src={url ? url : ''} className='h-full w-full object-cover object-center' />
          </div>

          <div className='flex w-full flex-col pl-[32px]'>
            <div className='mb-[12px] flex flex-col'>
              <span className='text-lg font-500 text-gray-800'>{data?.name}</span>
              <div className='flex items-center gap-[8px] text-md text-gray-600'>
                <span>Created by</span>
                <MetaAvatar creators={creators} />
              </div>
            </div>

            <div className='mb-[20px] flex flex-col'>
              {auction && <AuctionCard auctionView={auction} hideDefaultAction={false} />}
              {/* <div className='flex items-center gap-[4px]'>
                <i className='ri-price-tag-3-fill text-lg text-B-400' />
                <span className='mr-[8px] text-lg font-500 text-gray-800'>0.01 SOL</span>
                <span className='text-base text-gray-500'>$20.00</span>
              </div> */}
            </div>

            <NftDetailsTab
              attributes={attributes}
              description={description || 'No description provided.'}
            />
          </div>
        </div>

        <div className='relative flex w-full gap-[20px] py-[40px]'>
          {/* {auction && <AuctionCard auctionView={auction} hideDefaultAction={false} />} */}
        </div>

        <div className='flex w-full flex-col py-[20px]'>
          <div className='flex w-full justify-center border-b border-gray-100'>
            <TabHighlightButton
              isActive={activeTab === 'activity'}
              onClick={() => {
                setActiveTab('activity')
              }}>
              Activity
            </TabHighlightButton>

            <TabHighlightButton
              isActive={activeTab === 'offers'}
              onClick={() => {
                setActiveTab('offers')
              }}>
              Offers
            </TabHighlightButton>
          </div>

          <div className='flex pt-[28px]'>
            {activeTab === 'activity' && <NftActivityTable />}
            {activeTab === 'offers' && <NftOffersTable />}
          </div>
        </div>
      </div>
    </>
  )
}

const BidLine = (props: {
  bid: any
  index: number
  mint?: MintInfo
  isCancelled?: boolean
  isActive?: boolean
  mintKey: string
}) => {
  const { bid, mint, isCancelled, mintKey } = props
  const { wallet, publicKey } = useWallet()
  const bidder = bid.info.bidderPubkey
  const isme = publicKey?.toBase58() === bidder
  const tokenInfo = useTokenList().subscribedTokens.filter(m => m.address == mintKey)[0]
  // Get Twitter Handle from address
  const connection = useConnection()
  const [bidderTwitterHandle, setBidderTwitterHandle] = useState('')
  useEffect(() => {
    const getTwitterHandle = async (
      connection: Connection,
      bidder: StringPublicKey
    ): Promise<string | undefined> => {
      try {
        const [twitterHandle] = await getHandleAndRegistryKey(connection, toPublicKey(bidder))
        setBidderTwitterHandle(twitterHandle)
      } catch (err) {
        console.warn(`err`)
        return undefined
      }
    }
    getTwitterHandle(connection, bidder)
  }, [bidderTwitterHandle])
  const { width } = useWindowDimensions()
  if (width < 768) {
    return (
      <Row className='mobile-bid-history'>
        <div className='bid-info-container'>
          <div className='bidder-info-container'>
            <Identicon
              style={{
                width: 24,
                height: 24,
                marginRight: 10,
                marginTop: 2,
              }}
              address={bidder}
            />
            {bidderTwitterHandle ? (
              <a
                target='_blank'
                title={shortenAddress(bidder)}
                href={`https://twitter.com/${bidderTwitterHandle}`}
                rel='noreferrer'>{`@${bidderTwitterHandle}`}</a>
            ) : (
              shortenAddress(bidder)
            )}
          </div>
          <div>
            {!isCancelled && (
              <div className={'flex '}>
                {isme && (
                  <>
                    <CheckOutlined />
                    &nbsp;
                  </>
                )}
                <AmountLabel
                  style={{ marginBottom: 0, fontSize: '16px' }}
                  containerStyle={{
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  displaySymbol={tokenInfo?.symbol || 'CUSTOM'}
                  iconSize={24}
                  amount={formatTokenAmount(bid.info.lastBid, mint)}
                />
              </div>
            )}
          </div>
        </div>
        <div className='bid-info-container'>
          {format(bid.info.lastBidTimestamp.toNumber() * 1000)}
        </div>
      </Row>
    )
  } else {
    return (
      <Row className={'bid-history'}>
        {isCancelled && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              width: '100%',
              height: 1,
              background: 'grey',
              top: 'calc(50% - 1px)',
              zIndex: 2,
            }}
          />
        )}
        <Col span={8}>
          {!isCancelled && (
            <div className={'flex '}>
              {isme && (
                <>
                  <CheckOutlined />
                  &nbsp;
                </>
              )}
              <AmountLabel
                style={{ marginBottom: 0, fontSize: '16px' }}
                containerStyle={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                displaySymbol={tokenInfo?.symbol || 'CUSTOM'}
                tokenInfo={tokenInfo}
                iconSize={24}
                amount={formatTokenAmount(bid.info.lastBid, mint)}
              />
            </div>
          )}
        </Col>
        <Col span={8} style={{ opacity: 0.7 }}>
          {/* uses milliseconds */}
          {format(bid.info.lastBidTimestamp.toNumber() * 1000)}
        </Col>
        <Col span={8}>
          <div className={'flex-right'}>
            <Identicon
              style={{
                width: 24,
                height: 24,
                marginRight: 10,
                marginTop: 2,
              }}
              address={bidder}
            />{' '}
            <span style={{ opacity: 0.7 }}>
              {bidderTwitterHandle ? (
                <Row className='pubkey-row'>
                  <a
                    target='_blank'
                    title={shortenAddress(bidder)}
                    href={`https://twitter.com/${bidderTwitterHandle}`}
                    rel='noreferrer'>{`@${bidderTwitterHandle}`}</a>
                  <ClickToCopy className='copy-pubkey' copyText={bidder as string} />
                </Row>
              ) : (
                <Row className='pubkey-row'>
                  {shortenAddress(bidder)}
                  <ClickToCopy className='copy-pubkey' copyText={bidder as string} />
                </Row>
              )}
            </span>
          </div>
        </Col>
      </Row>
    )
  }
}

export const AuctionBids = ({ auctionView }: { auctionView?: Auction | null }) => {
  const bids = useBidsForAuction(auctionView?.auction.pubkey || '')

  const mint = useMint(auctionView?.auction.info.tokenMint)
  const { width } = useWindowDimensions()

  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false)

  const winnersCount = auctionView?.auction.info.bidState.max.toNumber() || 0
  const activeBids = auctionView?.auction.info.bidState.bids || []
  const activeBidders = useMemo(() => {
    return new Set(activeBids.map(b => b.key))
  }, [activeBids])
  const auctionState = auctionView ? auctionView.auction.info.state : AuctionState.Created
  const bidLines = useMemo(() => {
    let activeBidIndex = 0
    return bids.map((bid, index) => {
      const isCancelled =
        (index < winnersCount && !!bid.info.cancelled) ||
        (auctionState !== AuctionState.Ended && !!bid.info.cancelled)

      const line = (
        <BidLine
          bid={bid}
          index={activeBidIndex}
          key={index}
          mint={mint}
          isCancelled={isCancelled}
          isActive={!bid.info.cancelled}
          mintKey={auctionView?.auction.info.tokenMint || ''}
        />
      )

      if (!isCancelled) {
        activeBidIndex++
      }

      return line
    })
  }, [auctionState, bids, activeBidders])

  if (!auctionView || bids.length < 1) return null

  return (
    <>
      <Row>
        <Col className='bids-lists'>
          <h6 className={'info-title'}>Bid History</h6>
          {bidLines.slice(0, 10)}
          {bids.length > 10 && (
            <div
              className='full-history'
              onClick={() => setShowHistoryModal(true)}
              style={{
                cursor: 'pointer',
              }}>
              View full history
            </div>
          )}
          <MetaplexModal
            visible={showHistoryModal}
            onCancel={() => setShowHistoryModal(false)}
            title='Bid history'
            bodyStyle={{
              background: 'unset',
              boxShadow: 'unset',
              borderRadius: 0,
            }}
            centered
            width={width < 768 ? width - 10 : 600}>
            <div
              style={{
                maxHeight: 600,
                overflowY: 'scroll',
                width: '100%',
              }}>
              {bidLines}
            </div>
          </MetaplexModal>
        </Col>
      </Row>
    </>
  )
}
