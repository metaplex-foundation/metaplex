import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Button, Skeleton, Carousel } from 'antd';
import { AuctionCard } from '../../components/AuctionCard';
import { Connection } from '@solana/web3.js';
import {
  AuctionView as Auction,
  AuctionViewItem,
  useArt,
  useAuction,
  useBidsForAuction,
  useCreators,
  useExtendedArt,
} from '../../hooks';
import { ArtContent } from '../../components/ArtContent';

import {
  formatTokenAmount,
  Identicon,
  MetaplexModal,
  shortenAddress,
  useConnection,
  useConnectionConfig,
  fromLamports,
  useMint,
  useWallet,
  AuctionState,
  StringPublicKey,
  toPublicKey,
} from '@oyster/common';
import { MintInfo } from '@solana/spl-token';
import { getHandleAndRegistryKey } from '@solana/spl-name-service';
import useWindowDimensions from '../../utils/layout';
import { CheckOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import { ArtType } from '../../types';

export const AuctionItem = ({
  item,
  index,
  size,
  active,
}: {
  item: AuctionViewItem;
  index: number;
  size: number;
  active?: boolean;
}) => {
  const id = item.metadata.pubkey;
  var style: React.CSSProperties = {
    transform:
      index === 0
        ? ''
        : `translate(${index * 15}px, ${-40 * index}px) scale(${Math.max(
            1 - 0.2 * index,
            0,
          )})`,
    transformOrigin: 'right bottom',
    position: index !== 0 ? 'absolute' : 'static',
    zIndex: -1 * index,
    marginLeft: size > 1 && index === 0 ? '0px' : 'auto',
    background: 'black',
    boxShadow: 'rgb(0 0 0 / 10%) 12px 2px 20px 14px',
    height: 300,
  };
  return (
    <ArtContent
      pubkey={id}
      className="artwork-image stack-item"
      style={style}
      active={active}
      allowMeshRender={true}
    />
  );
};

export const AuctionView = () => {
  const { id } = useParams<{ id: string }>();
  const { env } = useConnectionConfig();
  const auction = useAuction(id);
  const [currentIndex, setCurrentIndex] = useState(0);
  const art = useArt(auction?.thumbnail.metadata.pubkey);
  const { ref, data } = useExtendedArt(auction?.thumbnail.metadata.pubkey);
  const creators = useCreators(auction);
  let edition = '';
  if (art.type === ArtType.NFT) {
    edition = 'Unique';
  } else if (art.type === ArtType.Master) {
    edition = 'NFT 0';
  } else if (art.type === ArtType.Print) {
    edition = `${art.edition} of ${art.supply}`;
  }
  const nftCount = auction?.items.flat().length;
  const winnerCount = auction?.items.length;

  const hasDescription = data === undefined || data.description === undefined;
  const description = data?.description;

  const items = [
    ...(auction?.items
      .flat()
      .reduce((agg, item) => {
        agg.set(item.metadata.pubkey, item);
        return agg;
      }, new Map<string, AuctionViewItem>())
      .values() || []),
    auction?.participationItem,
  ].map((item, index, arr) => {
    if (!item || !item?.metadata || !item.metadata?.pubkey) {
      return null;
    }

    return (
      <AuctionItem
        key={item.metadata.pubkey}
        item={item}
        index={index}
        size={arr.length}
        active={index === currentIndex}
      ></AuctionItem>
    );
  });

  return (
    <>
      <Row justify="space-around" ref={ref}>
        <Col span={24} md={12} className="pr-4">
          <div className="auction-view" style={{ minHeight: 300 }}>
            <Carousel
              autoplay={false}
              afterChange={index => setCurrentIndex(index)}
            >
              {items}
            </Carousel>
          </div>
          <h6>Number Of Winners</h6>
          <h1>
            {winnerCount === undefined ? (
              <Skeleton paragraph={{ rows: 0 }} />
            ) : (
              winnerCount
            )}
          </h1>
          <h6>Number Of NFTs</h6>
          <h1>
            {nftCount === undefined ? (
              <Skeleton paragraph={{ rows: 0 }} />
            ) : (
              nftCount
            )}
          </h1>
          <h6>About this {nftCount === 1 ? 'NFT' : 'Collection'}</h6>
          <div className="auction-paragraph">
            {hasDescription && <Skeleton paragraph={{ rows: 3 }} />}
            {description ||
              (winnerCount !== undefined && (
                <div style={{ fontStyle: 'italic' }}>
                  No description provided.
                </div>
              ))}
          </div>
          {/* {auctionData[id] && (
            <>
              <h6>About this Auction</h6>
              <p>{auctionData[id].description.split('\n').map((t: string) => <div>{t}</div>)}</p>
            </>
          )} */}
        </Col>

        <Col span={24} md={12}>
          <h2 className="art-title">
            {art.title || <Skeleton paragraph={{ rows: 0 }} />}
          </h2>
          <Row gutter={[50, 0]} style={{ marginRight: 'unset' }}>
            <Col>
              <h6>Edition</h6>
              {!auction && (
                <Skeleton title={{ width: '100%' }} paragraph={{ rows: 0 }} />
              )}
              {auction && (
                <p className="auction-art-edition">
                  {(auction?.items.length || 0) > 1 ? 'Multiple' : edition}
                </p>
              )}
            </Col>

            <Col>
              <h6>View on</h6>
              <div style={{ display: 'flex' }}>
                <Button
                  className="tag"
                  onClick={() => window.open(art.uri || '', '_blank')}
                >
                  Arweave
                </Button>
                <Button
                  className="tag"
                  onClick={() =>
                    window.open(
                      `https://explorer.solana.com/account/${art?.mint || ''}${
                        env.indexOf('main') >= 0 ? '' : `?cluster=${env}`
                      }`,
                      '_blank',
                    )
                  }
                >
                  Solana
                </Button>
              </div>
            </Col>
          </Row>

          {!auction && <Skeleton paragraph={{ rows: 6 }} />}
          {auction && <AuctionCard auctionView={auction} />}
          <AuctionBids auctionView={auction} />
        </Col>
      </Row>
    </>
  );
};

const BidLine = (props: {
  bid: any;
  index: number;
  mint?: MintInfo;
  isCancelled?: boolean;
  isActive?: boolean;
}) => {
  const { bid, index, mint, isCancelled, isActive } = props;
  const { wallet } = useWallet();
  const bidder = bid.info.bidderPubkey;
  const isme = wallet?.publicKey?.toBase58() === bidder;

  // Get Twitter Handle from address
  const connection = useConnection();
  const [bidderTwitterHandle, setBidderTwitterHandle] = useState('');
  useEffect(() => {
    const getTwitterHandle = async (
      connection: Connection,
      bidder: StringPublicKey,
    ): Promise<string | undefined> => {
      try {
        const [twitterHandle] = await getHandleAndRegistryKey(
          connection,
          toPublicKey(bidder),
        );
        setBidderTwitterHandle(twitterHandle);
      } catch (err) {
        console.warn(`err`);
        return undefined;
      }
    };
    getTwitterHandle(connection, bidder);
  }, [bidderTwitterHandle]);

  return (
    <Row
      style={{
        width: '100%',
        alignItems: 'center',
        padding: '3px 0',
        position: 'relative',
        opacity: isActive ? undefined : 0.5,
        ...(isme
          ? {
              backgroundColor: '#ffffff21',
            }
          : {}),
      }}
    >
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
      <Col
        span={2}
        style={{
          textAlign: 'right',
          paddingRight: 10,
        }}
      >
        {!isCancelled && (
          <div
            style={{
              opacity: 0.8,
              fontWeight: 700,
            }}
          >
            {isme && (
              <>
                <CheckOutlined />
                &nbsp;
              </>
            )}
            {index + 1}
          </div>
        )}
      </Col>
      <Col span={16}>
        <Row>
          <Identicon
            style={{
              width: 24,
              height: 24,
              marginRight: 10,
              marginTop: 2,
            }}
            address={bidder}
          />{' '}
          {bidderTwitterHandle ? (
            <a
              target="_blank"
              title={shortenAddress(bidder)}
              href={`https://twitter.com/${bidderTwitterHandle}`}
            >{`@${bidderTwitterHandle}`}</a>
          ) : (
            shortenAddress(bidder)
          )}
          {isme && <span style={{ color: '#6479f6' }}>&nbsp;(you)</span>}
        </Row>
      </Col>
      <Col span={6} style={{ textAlign: 'right' }}>
        <span title={fromLamports(bid.info.lastBid, mint).toString()}>
          ◎{formatTokenAmount(bid.info.lastBid, mint)}
        </span>
      </Col>
    </Row>
  );
};

export const AuctionBids = ({
  auctionView,
}: {
  auctionView?: Auction | null;
}) => {
  const bids = useBidsForAuction(auctionView?.auction.pubkey || '');

  const mint = useMint(auctionView?.auction.info.tokenMint);
  const { width } = useWindowDimensions();

  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  const winnersCount = auctionView?.auction.info.bidState.max.toNumber() || 0;
  const activeBids = auctionView?.auction.info.bidState.bids || [];
  const activeBidders = useMemo(() => {
    return new Set(activeBids.map(b => b.key));
  }, [activeBids]);

  const auctionState = auctionView
    ? auctionView.auction.info.state
    : AuctionState.Created;
  const bidLines = useMemo(() => {
    let activeBidIndex = 0;
    return bids.map((bid, index) => {
      let isCancelled =
        (index < winnersCount && !!bid.info.cancelled) ||
        (auctionState !== AuctionState.Ended && !!bid.info.cancelled);

      let line = (
        <BidLine
          bid={bid}
          index={activeBidIndex}
          key={index}
          mint={mint}
          isCancelled={isCancelled}
          isActive={!bid.info.cancelled}
        />
      );

      if (!isCancelled) {
        activeBidIndex++;
      }

      return line;
    });
  }, [auctionState, bids, activeBidders]);

  if (!auctionView || bids.length < 1) return null;

  return (
    <Col style={{ width: '100%' }}>
      <h6>Bid History</h6>
      {bidLines.slice(0, 10)}
      {bids.length > 10 && (
        <div
          className="full-history"
          onClick={() => setShowHistoryModal(true)}
          style={{
            cursor: 'pointer',
          }}
        >
          View full history
        </div>
      )}
      <MetaplexModal
        visible={showHistoryModal}
        onCancel={() => setShowHistoryModal(false)}
        title="Bid history"
        bodyStyle={{
          background: 'unset',
          boxShadow: 'unset',
          borderRadius: 0,
        }}
        centered
        width={width < 768 ? width - 10 : 600}
      >
        <div
          style={{
            maxHeight: 600,
            overflowY: 'scroll',
            width: '100%',
          }}
        >
          {bidLines}
        </div>
      </MetaplexModal>
    </Col>
  );
};
