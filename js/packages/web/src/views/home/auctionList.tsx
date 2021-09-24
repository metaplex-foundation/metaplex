import { useWallet } from '@solana/wallet-adapter-react';
import { Col, Layout, Row, Tabs, Spin, List } from 'antd';
import BN from 'bn.js';
import React, { useMemo, useState } from 'react';
import Masonry from 'react-masonry-css';
import { Link } from 'react-router-dom';
import { AuctionRenderCard } from '../../components/AuctionRenderCard';
import { CardLoader } from '../../components/MyLoader';
import { PreSaleBanner } from '../../components/PreSaleBanner';
import { useMeta } from '../../contexts';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import { AuctionView, AuctionViewState, useAuctions } from '../../hooks';

const { TabPane } = Tabs;

const { Content } = Layout;

export enum LiveAuctionViewState {
  All = '0',
  Participated = '1',
  Ended = '2',
  Resale = '3',
}

export const AuctionListView = () => {
  const { auctions, loading, hasNextPage, loadMore } = useAuctions();
  const { isLoading } = useMeta();
  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  const [sentryRef] = useInfiniteScroll({
    loading,
    hasNextPage,
    onLoadMore: loadMore,
    rootMargin: '0px 0px 200px 0px',
  });

  return (
    <>
      <Row>
        <List
          grid={{ gutter: 16, column: 4 }}
          dataSource={auctions}
          renderItem={item => (
            <List.Item key={item.auction.pubkey}>
              <Link to={`/auctions/${item.auction.pubkey}`}>
                <AuctionRenderCard auctionView={item} />
              </Link>
            </List.Item>
          )}
        />
        {(isLoading || loading || hasNextPage) && (
          <div ref={sentryRef}>
            <Spin />
          </div>
        )}
      </Row>
    </>
  );
};
