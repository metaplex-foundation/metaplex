import React, { useState, useEffect } from 'react';
import { Layout, Row, Col, Tabs, Button, Skeleton, Typography } from 'antd';
import Masonry from 'react-masonry-css';

import { PreSaleBanner } from '../../components/PreSaleBanner';
import { AuctionViewState, useAuctions, AuctionView } from '../../hooks';

import { AuctionRenderCard } from '../../components/AuctionRenderCard';
import { Link, useHistory } from 'react-router-dom';
import { CardLoader } from '../../components/MyLoader';
import { useApes, useMeta } from '../../contexts';
import { programIds, useConnection, useWallet } from '@oyster/common';
import { saveAdmin } from '../../actions/saveAdmin';
import { WhitelistedCreator } from '../../models/metaplex';


const { TabPane } = Tabs;

const { Content } = Layout;
const {Title} = Typography

export enum LiveAuctionViewState {
  All = '0',
  Participated = '1',
  Ended = '2',
  Resale = '3',
};

export const AuctionsView = () => {
  const auctions = useAuctions(AuctionViewState.Live);
  const auctionsEnded = useAuctions(AuctionViewState.Ended);
  const [activeKey, setActiveKey] = useState(LiveAuctionViewState.All);
  const { isLoading, store } = useMeta();
  const [isInitalizingStore, setIsInitalizingStore] = useState(false);
  const connection = useConnection();
  const history = useHistory();
  const { wallet, connect, connected } = useWallet();
  const {apes} = useApes();
  const [apeData, setApeData]=useState<any>();
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
  const liveAuctions = auctions;
  // .sort((a, b) => a.auction.info.endedAt?.sub(b.auction.info.endedAt || new BN(0)).toNumber() || 0)
  // .filter(a => !resaleAuctions.includes(a));

  let items = liveAuctions;

  switch (activeKey) {
      case LiveAuctionViewState.All:
        items = liveAuctions;
        break;
      case LiveAuctionViewState.Participated:
        items = liveAuctions.concat(auctionsEnded).filter((m, idx) => m.myBidderMetadata?.info.bidderPubkey == wallet?.publicKey?.toBase58());
        break;
      case LiveAuctionViewState.Resale:
        items = resaleAuctions;
        break;
      case LiveAuctionViewState.Ended:
        items = auctionsEnded;
        break;
  }

  const heroAuction = auctions[0]
  const liveAuctionsView = (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {!isLoading
        ? items.map((m, idx) => {
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
        ? auctionsEnded
            .map((m, idx) => {
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

  const CURRENT_STORE = programIds().store;

  useEffect(() => {
    if (auctions && auctions[0] && auctions[0]) {
      const meta = apes.find(a => auctions[0]?.items[0][0]?.metadata.info.mint.toString() === a.metadata.minted_token_pubkey);
      if (meta && !apeData) {
        fetch(meta.attributes.image_url).then(res => res.json()).then((res) => {
          setApeData(res)
        })
      }
    }

}, [apes, auctions, apeData])

  return (
    <Layout style={{ margin: 0, marginTop: 30, alignItems: 'center', color:'black' }}>
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
                      address: wallet?.publicKey.toBase58(),
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
      {heroAuction && <PreSaleBanner title={apeData?.name} auction={heroAuction} />}
      <Layout>
        <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Col style={{ width: '100%', marginTop: 10 }}>
            {isLoading && <Skeleton></Skeleton>}
            {/* {liveAuctions.length === 0 && !isLoading && (<Row>
              <Col span={24}>
                  <Title style= {{textAlign: 'center'}}>Currently there are no auctions</Title>
                  <Title style= {{textAlign: 'center'}} level={3}>Please check back later</Title>
              </Col>
            </Row>)} */}
            {(<Row>
              <Tabs activeKey={activeKey}
                  onTabClick={key => setActiveKey(key as LiveAuctionViewState)}>
                  <TabPane
                    tab={<span className="tab-title">Live Auctions</span>}
                    key={LiveAuctionViewState.All}
                  >
                    {liveAuctionsView}
                    {!liveAuctions.length && <div>
                      <Title style= {{textAlign: 'center'}}>Currently there are no auctions</Title>
                      <Title style= {{textAlign: 'center'}} level={3}>Please check back later</Title>
                      <div style={{ textAlign: 'center' }}>
                        <Link style={{ margin: '0 auto' }} to="/auction/create/0">
                          <Button
                            shape="round"
                            size="large"
                            type="primary"
                            style={{
                              cursor: 'pointer',
                            }}
                          >
                            Or create one
                          </Button>
                        </Link>
                      </div>
                      </div>}
                  </TabPane>
                  {auctionsEnded.length > 0 && (
                  <TabPane
                    tab={<span className="tab-title">Ended Auctions</span>}
                    key={LiveAuctionViewState.Ended}
                  >
                    {endedAuctions}
                  </TabPane>
                  )}
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