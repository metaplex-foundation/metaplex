import { useWallet } from '@oyster/common';
import { Col, Layout, Row, Tabs } from 'antd';
import BN from 'bn.js';
import React, { useMemo, useState } from 'react';
import Masonry from 'react-masonry-css';
import { Link } from 'react-router-dom';
import { AuctionRenderCard } from '../../components/AuctionRenderCard';
import { CardLoader } from '../../components/MyLoader';
import { PreSaleBanner } from '../../components/PreSaleBanner';
import { useMeta } from '../../contexts';
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
  const auctions = useAuctions(AuctionViewState.Live);
  const auctionsEnded = useAuctions(AuctionViewState.Ended);
  const [activeKey, setActiveKey] = useState(LiveAuctionViewState.All);
  const { isLoading } = useMeta();
  const { wallet, connected } = useWallet();
  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  // Check if the auction is primary sale or not
  const checkPrimarySale = (auc: AuctionView) => {
    var flag = 0;
    auc.items.forEach(i => {
      i.forEach(j => {
        if (j.metadata.info.primarySaleHappened == true) {
          flag = 1;
          return true;
        }
      });
      if (flag == 1) return true;
    });
    if (flag == 1) return true;
    else return false;
  };

  const resaleAuctions = auctions
    .sort(
      (a, b) =>
        a.auction.info.endedAt
          ?.sub(b.auction.info.endedAt || new BN(0))
          .toNumber() || 0,
    )
    .filter(m => checkPrimarySale(m) == true);

  // Removed resales from live auctions
  const liveAuctions = auctions
    .sort(
      (a, b) =>
        a.auction.info.endedAt
          ?.sub(b.auction.info.endedAt || new BN(0))
          .toNumber() || 0,
    )
    .filter(a => !resaleAuctions.includes(a));

  let items = liveAuctions;

  switch (activeKey) {
    case LiveAuctionViewState.All:
      items = liveAuctions;
      break;
    case LiveAuctionViewState.Participated:
      items = liveAuctions
        .concat(auctionsEnded)
        .filter(
          (m, idx) =>
            m.myBidderMetadata?.info.bidderPubkey ==
            wallet?.publicKey?.toBase58(),
        );
      break;
    case LiveAuctionViewState.Resale:
      items = resaleAuctions;
      break;
    case LiveAuctionViewState.Ended:
      items = auctionsEnded;
      break;
  }

  const heroAuction = useMemo(
    () =>
      auctions.filter(a => {
        // const now = moment().unix();
        return !a.auction.info.ended() && !resaleAuctions.includes(a);
        // filter out auction for banner that are further than 30 days in the future
        // return Math.floor(delta / 86400) <= 30;
      })?.[0],
    [auctions],
  );

  const liveAuctionsView = (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {!isLoading
        ? items.map((m, idx) => {
            if (m === heroAuction) {
              return;
            }

            const id = m.auction.pubkey;
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
        ? auctionsEnded.map((m, idx) => {
            if (m === heroAuction) {
              return;
            }

            const id = m.auction.pubkey;
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
    <>
      <PreSaleBanner auction={heroAuction} />
      <Layout>
        <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Col style={{ width: '100%', marginTop: 10 }}>
            {liveAuctions.length >= 0 && (
              <Row>
                <Tabs
                  activeKey={activeKey}
                  onTabClick={key => setActiveKey(key as LiveAuctionViewState)}
                >
                  <TabPane
                    tab={<span className="tab-title">Live Auctions</span>}
                    key={LiveAuctionViewState.All}
                  >
                    {liveAuctionsView}
                  </TabPane>
                  {auctionsEnded.length > 0 && (
                    <TabPane
                      tab={
                        <span className="tab-title">Secondary Marketplace</span>
                      }
                      key={LiveAuctionViewState.Resale}
                    >
                      {liveAuctionsView}
                    </TabPane>
                  )}
                  {auctionsEnded.length > 0 && (
                    <TabPane
                      tab={<span className="tab-title">Ended Auctions</span>}
                      key={LiveAuctionViewState.Ended}
                    >
                      {endedAuctions}
                    </TabPane>
                  )}
                  {
                    // Show all participated live and ended auctions except hero auction
                  }
                  {connected && (
                    <TabPane
                      tab={<span className="tab-title">Participated</span>}
                      key={LiveAuctionViewState.Participated}
                    >
                      {liveAuctionsView}
                    </TabPane>
                  )}
                </Tabs>
              </Row>
            )}
          </Col>
        </Content>
      </Layout>
    </>
  );
};
