import { useWallet } from '@solana/wallet-adapter-react';
import { Col, Layout, Row, Tabs } from 'antd';
import React, { useMemo, useState } from 'react';
import { PreSaleBanner } from '../../components/PreSaleBanner';
import { AuctionInputState, useQueryAuctions } from '../../graphql';
import { AuctionsGrid } from './AuctionsGrid';

export enum LiveAuctionViewState {
  All = '0',
  Participated = '1',
  Ended = '2',
  Resale = '3',
}

export const ResaleAuctions = () => {
  const [data, { fetching }] = useQueryAuctions({
    state: AuctionInputState.Resale,
  });

  return <AuctionsGrid items={data?.auctions} isLoading={fetching} />;
};

export const ParticipatedAuctions = () => {
  const { publicKey } = useWallet();
  const [data, { fetching }] = useQueryAuctions({
    participantId: publicKey?.toBase58(),
  });

  return <AuctionsGrid items={data?.auctions} isLoading={fetching} />;
};

export const EndedAuctions = () => {
  const [data, { fetching }] = useQueryAuctions({
    state: AuctionInputState.Ended,
  });

  return <AuctionsGrid items={data?.auctions} isLoading={fetching} />;
};

export const AuctionListView = () => {
  const [activeKey, setActiveKey] = useState(LiveAuctionViewState.All);
  const { connected } = useWallet();
  const [data, { fetching }] = useQueryAuctions({
    state: AuctionInputState.Live,
  });

  const heroAuction = useMemo(() => data?.auctions?.[0], [data?.auctions]);

  return (
    <>
      <PreSaleBanner auction={heroAuction} isLoading={fetching} />
      <Layout>
        <Layout.Content style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Col style={{ width: '100%', marginTop: 10 }}>
            <Row>
              <Tabs
                activeKey={activeKey}
                onTabClick={key => setActiveKey(key as LiveAuctionViewState)}
              >
                <Tabs.TabPane
                  tab={<span className="tab-title">Live Auctions</span>}
                  key={LiveAuctionViewState.All}
                >
                  <AuctionsGrid
                    items={data?.auctions}
                    isLoading={fetching}
                    heroPubkey={heroAuction?.pubkey}
                  />
                </Tabs.TabPane>
                <Tabs.TabPane
                  tab={<span className="tab-title">Secondary Marketplace</span>}
                  key={LiveAuctionViewState.Resale}
                >
                  <ResaleAuctions />
                </Tabs.TabPane>
                <Tabs.TabPane
                  tab={<span className="tab-title">Ended Auctions</span>}
                  key={LiveAuctionViewState.Ended}
                >
                  <EndedAuctions />
                </Tabs.TabPane>
                {connected && (
                  <Tabs.TabPane
                    tab={<span className="tab-title">Participated</span>}
                    key={LiveAuctionViewState.Participated}
                  >
                    <ParticipatedAuctions />
                  </Tabs.TabPane>
                )}
              </Tabs>
            </Row>
          </Col>
        </Layout.Content>
      </Layout>
    </>
  );
};
