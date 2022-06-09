import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Card, Carousel, Col, List, Row, Skeleton } from 'antd'
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
import { NFTDetailsTopBar } from '../../ui/sections/NFTDetailsTopBar'
import { Link } from 'react-router-dom'
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
  BidStateType,
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
import { Image, Avatar, AttributesCard } from '@oyster/common'
import { getProfile } from '../../api'
import { NFTDetailsTabs } from '../../ui/sections/NFTDetailsTabs'

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

export const AuctionView = () => {
  const { width } = useWindowDimensions()
  const { id } = useParams<{ id: string }>()
  const { endpoint } = useConnectionConfig()
  const auction = useAuction(id)

  console.log('auction2', auction)

  const [currentIndex, setCurrentIndex] = useState(0)
  const art = useArt(auction?.thumbnail.metadata.pubkey)
  const { ref, data } = useExtendedArt(auction?.thumbnail.metadata.pubkey)
  const creators = useCreators(auction)
  const { pullAuctionPage } = useMeta()
  useEffect(() => {
    pullAuctionPage(id)
  }, [])

  const owner = auction?.auctionManager?.authority
  const [user, setUser] = useState<any>({})
  useEffect(() => {
    if (!owner) return
    getProfile(owner || '').then(({ data }) => {
      setUser(data)
    })
  }, [owner])

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

  const tokenInfo = useTokenList()?.subscribedTokens.filter(
    m => m.address == auction?.auction.info.tokenMint
  )[0]

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

  if (width < 768) {
    return (
      <Row
        justify="center"
        gutter={[48, 0]}
        className="auction-mobile-container"
      >
        <Col span={24} className={'img-cont-500'}>
          <div className="auction-view" style={{ minHeight: 300 }}>
            <Carousel
              autoplay={false}
              afterChange={index => setCurrentIndex(index)}
            >
              {items}
            </Carousel>
          </div>
        </Col>
        <Col className="auction-mobile-section">
          <h2 className="art-title">
            {art.title || <Skeleton paragraph={{ rows: 0 }} />}
          </h2>

          <div className="info-container">
            <div className={'info-component'}>
              <h6 className={'info-title'}>Edition</h6>
              <span>
                {(auction?.items.length || 0) > 1 ? 'Multiple' : edition}
              </span>
            </div>
            <div className={'info-component'}>
              <h6 className={'info-title'}>Winners</h6>
              <span>
                {winnerCount === undefined ? (
                  <Skeleton paragraph={{ rows: 0 }} />
                ) : isOpen ? (
                  'Unlimited'
                ) : (
                  winnerCount
                )}
              </span>
            </div>
            <div className={'info-component'}>
              <h6 className={'info-title'}>NFTS</h6>
              <span>
                {nftCount === undefined ? (
                  <Skeleton paragraph={{ rows: 0 }} />
                ) : isOpen ? (
                  'Open'
                ) : (
                  nftCount
                )}
              </span>
            </div>
          </div>
        </Col>

        <Col className="auction-mobile-section" span={24}>
          {!auction && <Skeleton paragraph={{ rows: 6 }} />}
          {auction && <AuctionCard auctionView={auction} hideDefaultAction={false} />}
        </Col>
        <Col className="auction-mobile-section" span={24}>
          <h6 className={'info-title'}>Details</h6>
          <div className="description">
            <p className={'about-nft-collection a-description'}>
              {hasDescription && <Skeleton paragraph={{ rows: 3 }} />}
              {description ||
                (winnerCount !== undefined && (
                  <div style={{ fontStyle: 'italic' }}>
                    No description provided.
                  </div>
                ))}
            </p>
          </div>
        </Col>
        {attributes && (
          <Col
            className="auction-mobile-section about-nft-collection a-attributes"
            span={24}
          >
            <h6>Attributes</h6>
            <List grid={{ column: 4 }}>
              {attributes.map((attribute, index) => (
                <List.Item key={`${attribute.value}-${index}`}>
                  <Card title={attribute.trait_type}>{attribute.value}</Card>
                </List.Item>
              ))}
            </List>
          </Col>
        )}
        <Col className="auction-mobile-section" span={24}>
          <div className={'info-view'}>
            <h6 className={'info-title'}>Artists</h6>
            <div style={{ display: 'flex' }}>
              <MetaAvatarDetailed creators={creators} />
            </div>
          </div>
        </Col>
        <Col className="auction-mobile-section" span={24}>
          <div className={'info-view'}>
            <h6 className={'info-title'}>View on</h6>
            <div style={{ display: 'flex' }}>
              <Button
                className="tag"
                onClick={() => window.open(art.uri || '', '_blank')}
              >
                Arweave
              </Button>
              <Button
                className="tag"
                onClick={() => {
                  const cluster = endpoint.name
                  const explorerURL = new URL(
                    `account/${art?.mint || ''}`,
                    'https://explorer.solana.com',
                  )
                  if (!cluster.includes('mainnet')) {
                    explorerURL.searchParams.set('cluster', cluster)
                  }
                  window.open(explorerURL.href, '_blank')
                }}
              >
                Solana
              </Button>
            </div>
          </div>
        </Col>
        <Col className="auction-mobile-section" span={24}>
          <AuctionBids auctionView={auction} />
        </Col>
      </Row>
    )
  } else {
    console.log('items*********************', items)
    return (
      <Row justify="center" ref={ref} gutter={[48, 0]}>
        <Col span={48} md={20} className={'img-cont-500'}>
          <NFTDetailsTopBar onSetAuction={() => {}} id={id} className='pt-[20px] pb-[40px]' />
        </Col>
        <div className='container flex gap-[40px] rounded border border-slate-200 bg-white p-[40px] shadow-card-light'>
          <Col span={24} md={10} className={'img-cont-500'}>
              <div className='sidebar flex w-[400px] flex-shrink-0 flex-col gap-[40px]'>
                <div className="auction-view" style={{ minHeight: 300 }}>
                  <Carousel
                    autoplay={false}
                    afterChange={index => setCurrentIndex(index)}
                  >
                    {items}
                  </Carousel>
                </div>

                <div className='flex flex-col gap-[16px]'>
                  <h5 className='text-h5 font-500'>Description</h5>
                  <p className='text-md text-slate-600'>{data?.description}</p>
                </div>

              </div>
              {attributes && attributes?.length && (
                <div className='flex flex-col gap-[16px]' style={{marginTop: 30}}>
                  <h5 className='text-h5 font-500'>Attributes</h5>

                  <div className='flex w-full flex-col gap-[8px]'>
                    {(attributes || []).map(({ trait_type: label, value }: any, index: number) => {
                      // const tagVal =
                      //   attributesPercentages.find(p => p.trait_type === label && p.value === value) ||
                      //   null
                      return (
                        <AttributesCard
                          key={`${index}-${label}`}
                          overline={label}
                          label={value}
                          // tag={tagVal ? `🔥 ${tagVal?.percentage.toFixed(2)}%` : ''}
                          hasHoverEffect={false}
                          className='cursor-auto !py-[12px] !px-[16px]'
                        />
                      )
                    })}
                  </div>
                </div>
              )}
              {/* {attributes && (
                <div className={'about-nft-collection a-attributes'}>
                  <h6>Attributes</h6>
                  <List grid={{ column: 4 }}>
                    {attributes.map((attribute, index) => (
                      <List.Item key={`${attribute.value}-${index}`}>
                        <Card title={attribute.trait_type}>{attribute.value}</Card>
                      </List.Item>
                    ))}
                  </List>
                </div>
              )} */}
              {/* {auctionData[id] && (
                <>
                  <h6>About this Auction</h6>
                  <p>{auctionData[id].description.split('\n').map((t: string) => <div>{t}</div>)}</p>
                </>
              )} */}
            </Col>

          

          <Col span={24} md={14}>
            <h2 className='text-h2 font-500 text-slate-800 gap-[28px]'>
              {art.title || <Skeleton paragraph={{ rows: 0 }} />}
            </h2>
            <Row gutter={[44, 0]}>
              <Col span={12} md={16}>
                <div className={'flex flex-col gap-[28px]'}>
                  <div className='text-sm font-500 text-B-400'>
                    <Link to={`/profile/${owner}`}>
                      <Avatar
                        key={owner}
                        address={owner}
                        label={`Owned by — ${
                          user?.user_name ||
                          owner?.substring(0, 3) + '...' + owner?.substring(owner.length - 3)
                        }`}
                        size={32}
                        labelClassName='text-sm font-500 text-B-400'
                      />
                    </Link>
                  </div>
                  {/* <div className='flex flex-col gap-[12px]'>
                    <h5 className='text-h6 font-400'>Current price</h5>
                    <div className='flex items-center gap-[8px]'>
                      <SOLIcon size={24} />
                      <h4 className='text-h4 font-600 leading-[1]'>{'0.003'} SOL</h4>
                      <span className='ml-[4px] text-lg text-slate-500'>{'$34'}</span>
                    </div>
                  </div> */}
                  {/* <div className={'info-component'}>
                    <h6 className={'info-title'}>Edition</h6>
                    <span>
                      {(auction?.items.length || 0) > 1 ? 'Multiple' : edition}
                    </span>
                  </div>
                  <div className={'info-component'}>
                    <h6 className={'info-title'}>Winners</h6>
                    <span>
                      {winnerCount === undefined ? (
                        <Skeleton paragraph={{ rows: 0 }} />
                      ) : isOpen ? (
                        'Unlimited'
                      ) : (
                        winnerCount
                      )}
                    </span>
                  </div>
                  <div className={'info-component'}>
                    <h6 className={'info-title'}>NFTS</h6>
                    <span>
                      {nftCount === undefined ? (
                        <Skeleton paragraph={{ rows: 0 }} />
                      ) : isOpen ? (
                        'Open'
                      ) : (
                        nftCount
                      )}
                    </span>
                  </div>
                  <div className={'info-component'}>
                    <h6 className={'info-title'}>CURRENCY</h6>
                    <span>
                      {nftCount === undefined ? (
                        <Skeleton paragraph={{ rows: 0 }} />
                      ) : (
                        `${tokenInfo?.name || 'Custom Token'} ($${
                          tokenInfo?.symbol || 'CUSTOM'
                        })`
                      )}
                      <ClickToCopy
                        className="copy-pubkey"
                        copyText={
                          tokenInfo
                            ? tokenInfo?.address
                            : auction?.auction.info.tokenMint || ''
                        }
                      />
                    </span>
                  </div> */}
                </div>
              </Col>
              <Col span={12} md={8} className="view-on-container">
                <div className="info-view-container">
                  <div className="info-view" style={{visibility: 'hidden'}}>
                    <h6 className="info-title">View on</h6>
                    <div style={{ display: 'flex' }}>
                      <Button
                        className="tag"
                        onClick={() => window.open(art.uri || '', '_blank')}
                      >
                        Arweave
                      </Button>
                      <Button
                        className="tag"
                        onClick={() => {
                          const cluster = endpoint.name
                          const explorerURL = new URL(
                            `account/${art?.mint || ''}`,
                            'https://explorer.solana.com',
                          )
                          if (!cluster.includes('mainnet')) {
                            explorerURL.searchParams.set('cluster', cluster)
                          }
                          window.open(explorerURL.href, '_blank')
                        }}
                      >
                        Solana
                      </Button>
                    </div>
                  </div>
                </div>
              </Col>

            </Row>

            {!auction && <Skeleton paragraph={{ rows: 6 }} />}
            {auction && (
              <AuctionCard auctionView={auction} hideDefaultAction={false} />
            )}
            {auction && <NFTDetailsTabs auction={auction} />}
          </Col>
        </div>
      </Row>
    )
  }
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
          <h6 className={'info-title'}>{auctionView.isInstantSale ? 'Sale' : 'Bid'} Bid History</h6>
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
