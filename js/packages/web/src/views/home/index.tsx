import React, { useState, useMemo } from 'react';
import { Layout, Row, Col, Tabs, Button } from 'antd';
import Masonry from 'react-masonry-css';

import { PreSaleBanner } from '../../components/PreSaleBanner';
import { AuctionViewState, useAuctions, AuctionView } from '../../hooks';

import { AuctionRenderCard } from '../../components/AuctionRenderCard';
import { Link, useHistory } from 'react-router-dom';
import { CardLoader } from '../../components/MyLoader';
import { useMeta } from '../../contexts';
import BN from 'bn.js';
import { programIds, useConnection, useWallet } from '@oyster/common';
import { saveAdmin } from '../../actions/saveAdmin';
import { WhitelistedCreator } from '../../models/metaplex';


const { TabPane } = Tabs;

const { Content } = Layout;

export enum LiveAuctionViewState {
  All = '0',
  Participated = '1',
  Ended = '2',
  Resale = '3',
};


export const HomeView = () => {
  const auctions = useAuctions(AuctionViewState.Live);
  const auctionsEnded = useAuctions(AuctionViewState.Ended);
  const [activeKey, setActiveKey] = useState(LiveAuctionViewState.All);
  const { isLoading, store } = useMeta();
  const [isInitalizingStore, setIsInitalizingStore] = useState(false);
  const connection = useConnection();
  const history = useHistory();
  const { wallet, connect, connected } = useWallet();
  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  // Check if the auction is primary sale or not
  const checkPrimarySale = (auc:AuctionView) => {
    var flag = 0;
    auc.items.forEach(i => 
      {
        i.forEach(j => { 
          if (j.metadata.info.primarySaleHappened == true) {
            flag = 1;
            return true;
          }})
        if (flag == 1) return true;
      })
      if (flag == 1) return true; else return false;
  };

  const resaleAuctions = auctions.filter(m => checkPrimarySale(m) == true);

  // Removed resales from live auctions
  const liveAuctions = auctions
  .sort((a, b) => a.auction.info.endedAt?.sub(b.auction.info.endedAt || new BN(0)).toNumber() || 0)
  .filter(a => !resaleAuctions.includes(a));

  let items = liveAuctions;

  switch (activeKey) {
      case LiveAuctionViewState.All:
        items = liveAuctions;
        break;
      case LiveAuctionViewState.Participated:
        items = liveAuctions.concat(auctionsEnded).filter((m, idx) => m.myBidderMetadata?.info.bidderPubkey.toBase58() == wallet?.publicKey?.toBase58());
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

  const CURRENT_STORE = programIds().store;

  /* Place this below the story statement around line 206
     <PreSaleBanner auction={heroAuction} />  */
  return (
    <Layout style={{ margin: 0, marginTop: 30, alignItems: 'center' }}>
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
      <div className="FAQ">
        <h5>[• Magic Items Marketplace •]</h5>
      </div>
      <div className="mission">  
        <h2>You’re wandering a barren and enchanted wasteland, when you think you spy in the distance a large, billowing tent. Is it a mirage? Is it a miracle? You trudge toward it to get a closer look.</h2>
        <h2>When you reach the tent and peek inside, you can hardly believe your eyes. It’s a marketplace of sorts (a bright purple banner above the entrance reveals as much), but the objects being bought and sold inside this tent are somehow ethereal, clearly magical… You wonder to yourself, "Are they even objects?"</h2>
        <h2><a href="./#/rules">Ask a merchant what the marketplace is all about...</a></h2>
        <h2><a href="./#/artworks">Browse the tables and see what's available...</a></h2>
      </div>
      <Layout>
        <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Col style={{ width: '100%', marginTop: 10 }}>
            {liveAuctions.length >= 0 && (<Row>
              <Tabs activeKey={activeKey}
                  onTabClick={key => setActiveKey(key as LiveAuctionViewState)}>                
                  <TabPane
                    tab={<span className="tab-title">Live Auctions</span>}
                    key={LiveAuctionViewState.All}
                  >
                    {liveAuctionsView}
                  </TabPane>
                  {auctionsEnded.length > 0 && (
                  <TabPane
                    tab={<span className="tab-title">Secondary Marketplace</span>}
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
            </Row>)}
          </Col>
        </Content>
      </Layout>
    </Layout>
  );
};
