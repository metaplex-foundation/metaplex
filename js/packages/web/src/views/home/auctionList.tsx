import { Layout, Tabs, Spin, List } from 'antd';
import React from 'react';
import { Link } from 'react-router-dom';
import { AuctionRenderCard } from '../../components/AuctionRenderCard';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import { LoadingOutlined } from '@ant-design/icons';
import { useInfiniteScrollAuctions } from '../../hooks';

export enum LiveAuctionViewState {
  All = '0',
  Participated = '1',
  Ended = '2',
  Resale = '3',
}

export const AuctionListView = () => {
  const { auctions, loading, initLoading, hasNextPage, loadMore } = useInfiniteScrollAuctions();

  const [sentryRef] = useInfiniteScroll({
    loading,
    hasNextPage,
    onLoadMore: loadMore,
    rootMargin: '0px 0px 200px 0px',
  });

  return (
    initLoading ? (
      <div className="app-auctions-list--loading">
        <Spin indicator={<LoadingOutlined />} />
      </div>
    ) : (
      <List
        grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 4 }}
        dataSource={auctions}
        loadMore={
          hasNextPage && (
            <div className="app-auctions-list--loading" ref={sentryRef}>
              <Spin indicator={<LoadingOutlined />} />
            </div>
          )
        }
        renderItem={item => (
          <List.Item key={item.auction.pubkey}>
            <Link to={`/auction/${item.auction.pubkey}`}>
              <AuctionRenderCard auctionView={item} />
            </Link>
          </List.Item>
        )}
      />
    )
  );
};