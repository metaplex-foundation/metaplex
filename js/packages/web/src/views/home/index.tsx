import React, { useState, useMemo } from 'react';
import { Layout, Row, Col, Tabs } from 'antd';
import Masonry from 'react-masonry-css';

import { PreSaleBanner } from '../../components/PreSaleBanner';
import { AuctionViewState, useAuctions } from '../../hooks';

import './index.less';
import { AuctionRenderCard } from '../../components/AuctionRenderCard';
import { Link } from 'react-router-dom';
import { CardLoader } from '../../components/MyLoader';
import { useMeta } from '../../contexts';
import moment from 'moment';

const { TabPane } = Tabs;

const { Content } = Layout;
export const HomeView = () => {
  const auctions = useAuctions(AuctionViewState.Live);
  const auctionsEnded = useAuctions(AuctionViewState.Ended);
  const { isLoading } = useMeta();
  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  const heroAuction = useMemo(
    () =>
      auctions.filter(a => {
        const now = moment().unix();
        let delta = (a.auction.info.endedAt?.toNumber() || 0) - now;

        // filter out auction for banner that are further than 30 days in the future
        return Math.floor(delta / 86400) <= 30;
      })?.[0],
    [auctions],
  );

  const liveAuctions = (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {!isLoading
        ? auctions
            .filter((m, idx) => idx < 10)
            .map((m, idx) => {
              if (m === heroAuction) {
                return;
              }

              const id = m.auction.pubkey.toBase58();
              return (
                <Link to={`/auction/${id}`} key={idx}>
                  <AuctionRenderCard key={id} auctionView={m} />
                </Link>
              );
            })
        : [...Array(10)].map((_, idx) => <CardLoader key={idx} />)}
    </Masonry>
  );
  const endedAuctions = (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {!isLoading
        ? auctionsEnded
            .filter((m, idx) => idx < 10)
            .map((m, idx) => {
              if (m === heroAuction) {
                return;
              }

              const id = m.auction.pubkey.toBase58();
              return (
                <Link to={`/auction/${id}`} key={idx}>
                  <AuctionRenderCard key={id} auctionView={m} />
                </Link>
              );
            })
        : [...Array(10)].map((_, idx) => <CardLoader key={idx} />)}
    </Masonry>
  );

  return (
    <Layout style={{ margin: 0, marginTop: 30 }}>
      <PreSaleBanner auction={heroAuction} />
      <Layout>
        <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Col style={{ width: '100%', marginTop: 10 }}>
            <Row>
              <Tabs>
                <TabPane>
                  <h2>Live Auctions</h2>
                  {liveAuctions}
                </TabPane>
              </Tabs>
            </Row>
            <Row>
              <Tabs>
                <TabPane>
                  <h2>Ended Auctions</h2>
                  {endedAuctions}
                </TabPane>
              </Tabs>
              <br />
            </Row>
          </Col>
        </Content>
      </Layout>
    </Layout>
  );
};
