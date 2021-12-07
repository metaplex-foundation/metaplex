import { useWallet } from '@solana/wallet-adapter-react';
import React, { useEffect, useState } from 'react';
import { Layout, Row, Col, Tabs, Button } from 'antd';
import { useMeta } from '../../contexts';
import { CardLoader } from '../../components/MyLoader';

import { ArtworkViewState } from './types';
import { useItems } from './hooks/useItems';
import ItemCard from './components/ItemCard';
import { useUserAccounts } from '@oyster/common';

const { TabPane } = Tabs;
const { Content } = Layout;

export const ArtworksView = () => {
  const { connected } = useWallet();
  const { isLoading, pullAllMetadata, storeIndexer, pullItemsPage } = useMeta();
  const { userAccounts } = useUserAccounts();

  const [activeKey, setActiveKey] = useState(ArtworkViewState.Metaplex);

  const userItems = useItems({ activeKey });

  useEffect(() => {
    pullItemsPage(userAccounts);
  }, []);

  useEffect(() => {
    if (connected) {
      setActiveKey(ArtworkViewState.Owned);
    } else {
      setActiveKey(ArtworkViewState.Metaplex);
    }
  }, [connected, setActiveKey]);

  const artworkGrid = (
    <div className="artwork-grid">
      {isLoading && [...Array(10)].map((_, idx) => <CardLoader key={idx} />)}
      {!isLoading &&
        userItems.map(item => <ItemCard item={item} key={item.pubkey} />)}
    </div>
  );

  const refreshButton = connected && storeIndexer.length !== 0 && (
    <Button className="refresh-button" onClick={() => pullAllMetadata()}>
      Refresh
    </Button>
  );

  return (
    <Layout style={{ margin: 0, marginTop: 30 }}>
      <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
        <Col style={{ width: '100%', marginTop: 10 }}>
          <Row>
            <Tabs
              activeKey={activeKey}
              onTabClick={key => setActiveKey(key as ArtworkViewState)}
              tabBarExtraContent={refreshButton}
            >
              <TabPane
                tab={<span className="tab-title">All</span>}
                key={ArtworkViewState.Metaplex}
              >
                {artworkGrid}
              </TabPane>
              {connected && (
                <TabPane
                  tab={<span className="tab-title">Owned</span>}
                  key={ArtworkViewState.Owned}
                >
                  {artworkGrid}
                </TabPane>
              )}
              {connected && (
                <TabPane
                  tab={<span className="tab-title">Created</span>}
                  key={ArtworkViewState.Created}
                >
                  {artworkGrid}
                </TabPane>
              )}
            </Tabs>
          </Row>
        </Col>
      </Content>
    </Layout>
  );
};
