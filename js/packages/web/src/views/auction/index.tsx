import { CheckOutlined } from '@ant-design/icons';
import { LoadingOutlined } from '@ant-design/icons';
import {
  AuctionState,
  BidderMetadata,
  formatTokenAmount,
  Identicon,
  MetaplexModal,
  ParsedAccount,
  shortenAddress,
  StringPublicKey,
  toPublicKey,
  useConnection,
  useMint,
} from '@oyster/common';
import { AuctionViewItem } from '@oyster/common/dist/lib/models/metaplex/index';
import { getHandleAndRegistryKey } from '@solana/spl-name-service';
import { MintInfo } from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import {
  Button,
  Card,
  Carousel,
  Col,
  List,
  Row,
  Skeleton,
  Space,
  Spin,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'timeago.js';
import { AmountLabel } from '../../components/AmountLabel';
import { ArtContent } from '../../components/ArtContent';
import { AuctionCard } from '../../components/AuctionCard';
import { ClickToCopy } from '../../components/ClickToCopy';
import { MetaAvatar } from '../../components/MetaAvatar';
import { ViewOn } from '../../components/ViewOn';
import {
  AuctionView as Auction,
  useArt,
  useAuction,
  useBidsForAuction,
  useCreators,
  useExtendedArt,
} from '../../hooks';
import { ArtType } from '../../types';
import useWindowDimensions from '../../utils/layout';

export const AuctionItem = ({
  item,
  active,
}: {
  item: AuctionViewItem;
  active?: boolean;
}) => {
  const id = item.metadata.pubkey;
  return <ArtContent pubkey={id} active={active} allowMeshRender={true} />;
};

export const AuctionView = () => {
  const { id } = useParams<{ id: string }>();
  const { loading, auction } = useAuction(id);
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
  const attributes = data?.attributes;

  if (loading) {
    return (
      <div className="app-section--loading">
        <Spin indicator={<LoadingOutlined />} />
      </div>
    );
  }

  const items = [
    ...(auction?.items
      .flat()
      .reduce((agg, item) => {
        agg.set(item.metadata.pubkey, item);
        return agg;
      }, new Map<string, AuctionViewItem>())
      .values() || []),
    auction?.participationItem,
  ].map((item, index) => {
    if (!item || !item?.metadata || !item.metadata?.pubkey) {
      return null;
    }

    return (
      <AuctionItem
        key={item.metadata.pubkey}
        item={item}
        active={index === currentIndex}
      />
    );
  });

  return (
    <Row justify="center" ref={ref} gutter={[48, 0]}>
      <Col span={24} md={6} lg={8}>
        <Carousel
          className="metaplex-spacing-bottom-md"
          autoplay={false}
          afterChange={index => setCurrentIndex(index)}
        >
          {items}
        </Carousel>
        <h6>ABOUT THIS {nftCount === 1 ? 'NFT' : 'COLLECTION'}</h6>
        <p>
          {hasDescription && <Skeleton paragraph={{ rows: 3 }} />}
          {description ||
            (winnerCount !== undefined && <div>No description provided.</div>)}
        </p>
        {attributes && (
          <div>
            <h6>Attributes</h6>
            <List grid={{ column: 4 }}>
              {attributes.map((attribute, index) => (
                <List.Item key={`${attribute.value}-${index}`}>
                  <List.Item.Meta title={attribute.trait_type} description={attribute.value} />
                </List.Item>
              ))}
            </List>
          </div>
        )}
      </Col>

      <Col span={24} md={{ offset: 0, span: 16 }} lg={{ offset: 2, span: 12 }}>
        <h2>{art.title || <Skeleton paragraph={{ rows: 0 }} />}</h2>
        <Row className="metaplex-spacing-bottom-lg">
          <Col span={12}>
            <Space direction="horizontal" align="start">
              <div>
                <h6>CREATED BY</h6>
                <span>{<MetaAvatar creators={creators} />}</span>
              </div>
              <div>
                <h6>Edition</h6>
                <span>
                  {(auction?.items.length || 0) > 1 ? 'Multiple' : edition}
                </span>
              </div>
              <div>
                <h6>Winners</h6>
                <span>
                  {winnerCount === undefined ? (
                    <Skeleton paragraph={{ rows: 0 }} />
                  ) : (
                    winnerCount
                  )}
                </span>
              </div>
              <div>
                <h6>NFTS</h6>
                <span>
                  {nftCount === undefined ? (
                    <Skeleton paragraph={{ rows: 0 }} />
                  ) : (
                    nftCount
                  )}
                </span>
              </div>
            </Space>
          </Col>
          <Col span={12}>
            <Row justify="end">
              <ViewOn art={art} />
            </Row>
          </Col>
        </Row>

        {!auction && <Skeleton paragraph={{ rows: 6 }} />}
        {auction && (
          <AuctionCard auctionView={auction} hideDefaultAction={false} />
        )}
        {!auction?.isInstantSale && <AuctionBids auctionView={auction} />}
      </Col>
    </Row>
  );
};

const BidLine = (props: {
  bid: ParsedAccount<BidderMetadata>;
  index: number;
  mint?: MintInfo;
  isCancelled?: boolean;
  isActive?: boolean;
}) => {
  const { bid, mint, isCancelled } = props;
  const { publicKey } = useWallet();
  const bidder = bid.info.bidderPubkey;
  const isme = publicKey?.toBase58() === bidder;

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
    <Row wrap={false} align="middle" className="metaplex-fullwidth">
      <Col span={9}>
        {isCancelled ? (
          <div />
        ) : (
          <Space direction="horizontal">
            {isme && <CheckOutlined />}
            <AmountLabel
              displaySOL={true}
              amount={formatTokenAmount(bid.info.lastBid, mint)}
            />
          </Space>
        )}
      </Col>

      <Col span={6}>
        {/* uses milliseconds */}
        {format(bid.info.lastBidTimestamp.toNumber() * 1000)}
      </Col>
      <Col span={9}>
        <Space
          direction="horizontal"
          align="center"
          className="metaplex-fullwidth metaplex-space-justify-end"
        >
          <Identicon size={24} address={bidder} />
          {bidderTwitterHandle ? (
            <a
              target="_blank"
              rel="noopener noreferrer"
              title={shortenAddress(bidder)}
              href={`https://twitter.com/${bidderTwitterHandle}`}
            >{`@${bidderTwitterHandle}`}</a>
          ) : (
            shortenAddress(bidder)
          )}
          <ClickToCopy copyText={bidder} />
        </Space>
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
      const isCancelled =
        (index < winnersCount && !!bid.info.cancelled) ||
        (auctionState !== AuctionState.Ended && !!bid.info.cancelled);

      const line = (
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
    <Space direction="vertical" className="metaplex-fullwidth">
      <h6>Bid History</h6>
      <div>{bidLines.slice(0, 10)}</div>
      {bids.length > 10 && (
        <Button onClick={() => setShowHistoryModal(true)}>
          View full history
        </Button>
      )}
      <MetaplexModal
        visible={showHistoryModal}
        onCancel={() => setShowHistoryModal(false)}
        title="Bid history"
        centered
        width={width < 768 ? width - 10 : 600}
      >
        {bidLines}
      </MetaplexModal>
    </Space>
  );
};
