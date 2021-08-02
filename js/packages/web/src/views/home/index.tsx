import React, { useState, useMemo } from 'react';
import { Layout, Row, Col, Tabs, Button } from 'antd';
import Masonry from 'react-masonry-css';
import { HowToBuyModal } from '../../components/HowToBuyModal';

import { AuctionViewState, useAuctions } from '../../hooks';

import './index.less';
import { AuctionRenderCard } from '../../components/AuctionRenderCard';
import { Link, useHistory } from 'react-router-dom';
import { CardLoader } from '../../components/MyLoader';
import { useMeta } from '../../contexts';
import BN from 'bn.js';
import { programIds, useConnection, useWallet } from '@oyster/common';
import { saveAdmin } from '../../actions/saveAdmin';
import { WhitelistedCreator } from '../../models/metaplex';
import { Banner } from '../../components/Banner';

const { TabPane } = Tabs;

const { Content } = Layout;
export const HomeView = () => {
  const auctions = useAuctions(AuctionViewState.Live);
  const auctionsEnded = useAuctions(AuctionViewState.Ended);
  const auctionsUpcoming = useAuctions(AuctionViewState.Upcoming);
  const { isLoading, store } = useMeta();
  const [isInitalizingStore, setIsInitalizingStore] = useState(false);
  const connection = useConnection();
  const history = useHistory();
  const { wallet, connect } = useWallet();
  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  const heroAuction = useMemo(
    () =>
      auctions.filter(a => {
        // const now = moment().unix();
        return !a.auction.info.ended();
        // filter out auction for banner that are further than 30 days in the future
        // return Math.floor(delta / 86400) <= 30;
      })?.[0],
    [auctions],
  );

  const liveAuctions = auctions.sort(
    (a, b) =>
      a.auction.info.endedAt
        ?.sub(b.auction.info.endedAt || new BN(0))
        .toNumber() || 0,
  );

  const liveAuctionsView = (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {!isLoading
        ? liveAuctions.map((m, idx) => {
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
  const upcomingAuctions = (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {!isLoading
        ? auctionsUpcoming.map((m, idx) => {
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

  const CURRENT_STORE = programIds().store;

  return (
    <Layout style={{ margin: 0, alignItems: 'center' }}>
      {!store && !isLoading && (
        <>
          {!CURRENT_STORE && (
            <p>
              Store has not been configured please set{' '}
              <em>REACT_APP_STORE_OWNER_ADDRESS_ADDRESS</em> to admin wallet
              inside <em>packages/web/.env</em> and restart yarn
            </p>
          )}
          {CURRENT_STORE && !wallet?.publicKey && (
            <p>
              <Button type="primary" className="app-btn" onClick={connect}>
                Connect
              </Button>{' '}
              to configure store.
            </p>
          )}
          {CURRENT_STORE && wallet?.publicKey && (
            <>
              <p>
                Initializing store will allow you to control list of creators.
              </p>

              <Button
                className="app-btn"
                type="primary"
                loading={isInitalizingStore}
                disabled={!CURRENT_STORE}
                onClick={async () => {
                  if (!wallet?.publicKey) {
                    return;
                  }

                  setIsInitalizingStore(true);

                  await saveAdmin(connection, wallet, false, [
                    new WhitelistedCreator({
                      address: wallet?.publicKey,
                      activated: true,
                    }),
                  ]);

                  history.push('/admin');

                  window.location.reload();
                }}
              >
                Init Store
              </Button>
            </>
          )}
        </>
      )}
      {/* <PreSaleBanner auction={heroAuction} /> */}
      <Banner
        src={'/main-banner.svg'}
        headingText={"The amazing world of McFarlane."}
        subHeadingText={"Buy exclusive McFarlane NFTs."}
        actionComponent={<HowToBuyModal buttonClassName="secondary-btn" />}
        useBannerBg={true}
      />
      <Layout>
        <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Col style={{ width: '100%', marginTop: 32 }}>
            <Row>
              <Tabs>
                <TabPane
                  tab={
                    <>
                      <span className={'live'}></span> Live
                    </>
                  }
                  key={1}
                  active={true}
                >
                  {liveAuctionsView}
                </TabPane>
                <TabPane tab={'Upcoming'} key={2}>
                  {upcomingAuctions}
                </TabPane>
                <TabPane tab={'Ended'} key={3}>
                  {endedAuctions}
                </TabPane>
              </Tabs>
            </Row>
          </Col>
        </Content>
      </Layout>
    </Layout>
  );
};
