import { useWallet } from '@solana/wallet-adapter-react';
import { Col, Layout, Row, Tabs } from 'antd';
import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import Masonry from 'react-masonry-css';

import { useMeta } from '../../../../contexts';
import { CardLoader } from '../../../../components/MyLoader';
import { Banner } from '../../../../components/Banner';
import { HowToBuyModal } from '../../../../components/HowToBuyModal';

import { useAuctionsList } from './hooks/useAuctionsList';
import { AuctionRenderCard } from '../../../../components/AuctionRenderCard';

const { TabPane } = Tabs;
const { Content } = Layout;

export enum LiveAuctionViewState {
  All = '0',
  Participated = '1',
  Ended = '2',
  Resale = '3',
}

const breakpointColumnsObj = {
  default: 4,
  1100: 3,
  700: 2,
  500: 1,
};

export const SalesListView = () => {
  const [activeKey, setActiveKey] = useState(LiveAuctionViewState.All);
  const { isLoading } = useMeta();
  const { connected } = useWallet();
  const { auctions, hasResaleAuctions } = useAuctionsList(activeKey);

  return (
    <>
      <Banner
        src="/main-banner.svg"
        headingText="The amazing world of Metaplex."
        subHeadingText="Buy exclusive Metaplex NFTs."
        actionComponent={<HowToBuyModal buttonClassName="secondary-btn" />}
        useBannerBg
      />
      {/* <RedeemItemModal /> */}
      <Layout>
        <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Col style={{ width: '100%', marginTop: 32 }}>
            <Row>
              <Tabs
                activeKey={activeKey}
                onTabClick={key => setActiveKey(key as LiveAuctionViewState)}
              >
                <TabPane
                  tab={
                    <>
                      <span className="live"></span> Live
                    </>
                  }
                  key={LiveAuctionViewState.All}
                ></TabPane>
                {hasResaleAuctions && (
                  <TabPane
                    tab="Secondary Marketplace"
                    key={LiveAuctionViewState.Resale}
                  ></TabPane>
                )}
                <TabPane tab="Ended" key={LiveAuctionViewState.Ended}></TabPane>
                {connected && (
                  <TabPane
                    tab="Participated"
                    key={LiveAuctionViewState.Participated}
                  ></TabPane>
                )}
              </Tabs>
            </Row>
            <Row>
              <Masonry
                breakpointCols={breakpointColumnsObj}
                className="masonry-grid"
                columnClassName="masonry-grid_column"
              >
                {isLoading &&
                  [...Array(10)].map((_, idx) => <CardLoader key={idx} />)}
                {!isLoading &&
                  auctions.map(auction => (
                    <Link
                      key={auction.auction.pubkey}
                      to={`/auction/${auction.auction.pubkey}`}
                    >
                      <AuctionRenderCard auctionView={auction} />
                    </Link>
                  ))}
              </Masonry>
            </Row>
          </Col>
        </Content>
      </Layout>
    </>
  );
};
