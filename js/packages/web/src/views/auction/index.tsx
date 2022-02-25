import { InfoCircleFilled, LoadingOutlined } from '@ant-design/icons';
import {
  AuctionState,
  MetaplexModal,
  shortenAddress,
  useConnection,
  useMint,
  useMeta,
  subscribeProgramChanges,
  AUCTION_ID,
  processAuctions,
  METAPLEX_ID,
  processMetaplexAccounts,
  VAULT_ID,
  processVaultData,
} from '@oyster/common';
import { actions } from '@metaplex/js';
import { PublicKey } from '@solana/web3.js';
import { AuctionViewItem } from '@oyster/common/dist/lib/models/metaplex/index';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  Button,
  Carousel,
  List,
  Skeleton,
  Spin,
  Tooltip,
  notification,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArtContent } from '../../components/ArtContent';
import { AuctionCard } from '../../components/AuctionCard';
import { ViewOn } from '../../components/ViewOn';
import { some } from 'lodash';
import {
  AuctionView as Auction,
  useArt,
  useAuction,
  useBidsForAuction,
  useCreators,
  useExtendedArt,
  useWinningBidsForAuction,
} from '../../hooks';
import { ArtType } from '../../types';
import useWindowDimensions from '../../utils/layout';
import { Card } from 'antd';
import BidLine from './BidLine';

export const AuctionItem = ({
  item,
  active,
}: {
  item: AuctionViewItem;
  active?: boolean;
}) => {
  const id = item.metadata.pubkey;

  return (
    <ArtContent
      pubkey={id}
      active={active}
      allowMeshRender={true}
      backdrop="dark"
      square={false}
    />
  );
};

export const AuctionView = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <></>;
  }

  const { loading, auction } = useAuction(id);
  const connection = useConnection();
  const { patchState } = useMeta();
  const [currentIndex, setCurrentIndex] = useState(0);
  const art = useArt(auction?.thumbnail?.metadata?.pubkey);
  const { ref, data } = useExtendedArt(auction?.thumbnail?.metadata?.pubkey);
  const creators = useCreators(auction);
  const wallet = useWallet();
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

  const description = data?.description;
  const attributes = data?.attributes;

  useEffect(() => {
    return subscribeProgramChanges(
      connection,
      patchState,
      {
        programId: AUCTION_ID,
        processAccount: processAuctions,
      },
      {
        programId: METAPLEX_ID,
        processAccount: processMetaplexAccounts,
      },
      {
        programId: VAULT_ID,
        processAccount: processVaultData,
      },
    );
  }, [connection]);

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

  const getArt = (className: string) => (
    <div className={className}>
      <Carousel
        className="metaplex-margin-bottom-8"
        autoplay={false}
        afterChange={index => setCurrentIndex(index)}
      >
        {items}
      </Carousel>
    </div>
  );

  const getDescriptionAndAttributes = (className: string) => (
    <div className={className}>
      {description && (
        <>
          <h3 className="info-header">Description</h3>
          <p>{description}</p>
        </>
      )}

      {attributes && attributes.length > 0 && (
        <div className="mt-8">
          <h3 className="info-header">Attributes</h3>
          <div className="grid grid-cols-2 gap-6">
            {attributes.map((attribute, index) => (
              <div key={`${attribute.value}-${index}`}>
                <h4 className="mb-1">{attribute.trait_type}</h4>
                <span className="max-w-fit">{attribute.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
  // const bids = useBidsForAuction(auction.auction.pubkey);

  return (
    <div className="item-page-wrapper" ref={ref}>
      <div className="item-page-left">
        {getArt('art-desktop')}
        {getDescriptionAndAttributes('art-desktop')}
      </div>

      <div className="item-page-right">
        <div className="title-row">
          <h1 className="text-3xl">
            {art.title || <Skeleton paragraph={{ rows: 0 }} />}
          </h1>
          <ViewOn art={art} />
        </div>

        {getArt('art-mobile')}
        {getDescriptionAndAttributes('art-mobile')}

        {wallet.publicKey?.toBase58() === auction?.auctionManager.authority && (
          <Link to={`/listings/${id}/billing`}>
            <Button type="ghost" className="metaplex-margin-bottom-8">
              Billing / Settlement
            </Button>
          </Link>
        )}

        <div className="info-outer-wrapper">
          <div className="info-items-wrapper">
            <div className="info-item-wrapper">
              <span className="item-title">
                {creators.length > 1 ? 'Creators' : 'Creator'}
              </span>
              {creators.map(creator => (
                <span className="info-address" key={creator.address}>
                  {shortenAddress(creator.address || '')}
                </span>
              ))}
            </div>
            <div className="info-item-wrapper">
              <span className="item-title">Edition</span>
              <span>
                {(auction?.items.length || 0) > 1
                  ? 'Multiple'
                  : edition === 'NFT 0'
                  ? 'Master'
                  : edition}
              </span>
            </div>
            <div className="info-item-wrapper">
              <span className="item-title">Winners</span>
              <span>
                {winnerCount === undefined ? (
                  <Skeleton paragraph={{ rows: 0 }} />
                ) : (
                  winnerCount
                )}
              </span>
            </div>
            <div className="info-item-wrapper">
              <span className="item-title">NFTs</span>
              <span>
                {nftCount === undefined ? (
                  <Skeleton paragraph={{ rows: 0 }} />
                ) : (
                  nftCount
                )}
              </span>
            </div>
            {(auction?.items.length || 0) > 1 && (
              <div className="info-item-wrapper">
                <span className="item-title">Remaining</span>
                <span>
                  {art.maxSupply === undefined ? (
                    <Skeleton paragraph={{ rows: 0 }} />
                  ) : (
                    <span className="flex justify-center items-center text-sm">
                      {`${(art.maxSupply || 0) - (art.supply || 0)} of ${
                        art.maxSupply || 0
                      } `}
                      <Tooltip
                        title="Max supply may include items from previous listings"
                        className="ml-2"
                      >
                        <InfoCircleFilled size={12} />
                      </Tooltip>
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="margin-bottom-7">
          {!auction && <Skeleton paragraph={{ rows: 6 }} />}
          {auction && (
            <AuctionCard auctionView={auction} hideDefaultAction={false} />
          )}
        </div>
        {!auction?.isInstantSale && <AuctionBids auctionView={auction} />}
      </div>
    </div>
  );
};

export const AuctionBids = ({
  auctionView,
}: {
  auctionView?: Auction | null;
}) => {
  const auctionPubkey = auctionView?.auction.pubkey || '';
  const bids = useBidsForAuction(auctionPubkey);
  const connection = useConnection();
  const wallet = useWallet();
  const [cancellingBid, setCancellingBid] = useState(false);

  const mint = useMint(auctionView?.auction.info.tokenMint);
  const { width } = useWindowDimensions();

  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  const activeBids = auctionView?.auction.info.bidState.bids || [];
  const winners = useWinningBidsForAuction(auctionPubkey);
  const isWinner = some(
    winners,
    bid => bid.info.bidderPubkey === wallet.publicKey?.toBase58(),
  );
  const auctionState = auctionView
    ? auctionView.auction.info.state
    : AuctionState.Created;
  const auctionRunning = auctionState !== AuctionState.Ended;

  // I don't think this is actually used
  const activeBidders = useMemo(() => {
    return new Set(activeBids.map(b => b.key));
  }, [activeBids]);

  const bidLines = useMemo(() => {
    return bids.map((bid, index) => {
      const line = <BidLine bid={bid} key={bid.pubkey} mint={mint} />;

      return line;
    });
  }, [auctionState, bids, activeBidders]);

  if (!auctionView || bids.length < 1) return null;

  return (
    <div className="mt-8">
      <Card
        bordered={false}
        className="metaplex-margin-bottom-4 auction-card"
        title={'Bid history'}
        bodyStyle={{ padding: 0 }}
        extra={
          auctionView.myBidderMetadata &&
          !auctionView.myBidderMetadata.info.cancelled &&
          !isWinner && (
            <Button
              type={auctionRunning ? 'ghost' : 'primary'}
              disabled={isWinner}
              loading={cancellingBid}
              onClick={async () => {
                const myBidderPot = auctionView.myBidderPot;

                if (!myBidderPot) {
                  return;
                }

                setCancellingBid(true);

                try {
                  await actions.cancelBid({
                    connection,
                    //@ts-ignore
                    wallet,
                    auction: new PublicKey(auctionView.auction.pubkey),
                    bidderPotToken: new PublicKey(myBidderPot.info.bidderPot),
                  });

                  notification.success({
                    message: 'Bid Cancelled',
                    description:
                      'Your bid was successfully cancelled. You may rebid to enter the auction again.',
                  });
                } catch {
                  notification.error({
                    message: 'Bid Cancel Error',
                    description:
                      'There was an issue cancelling your bid. Please check your transaction history and try again.',
                  });
                } finally {
                  setCancellingBid(false);
                }
              }}
            >
              {auctionRunning ? 'Cancel Bid' : 'Refund bid'}
            </Button>
          )
        }
      >
        <div className=" overflow-hidden">
          <ul role="list" className="divide-y divide-color-border">
            {bidLines}
            {/* {bids.map(bid => (
              
              <BidLine bid={bid} key={bid.pubkey} mint={mint} />
            ))} */}
          </ul>
        </div>
      </Card>

      {/* <div className="space-y-8 md:space-y-0">{bidLines.slice(0, 10)}</div> */}
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
    </div>
  );
};
