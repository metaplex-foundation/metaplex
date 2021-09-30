import React, { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Layout, Row, Col, Tabs } from 'antd';
import { Artwork, useQueryArtworks } from '../../graphql';
import { ArtworkGrid } from './ArtworksGrid';

const { TabPane } = Tabs;

const { Content } = Layout;

export enum ArtworkViewState {
  Metaplex = '0',
  Owned = '1',
  Created = '2',
}

export const AllArtwoks = () => {
  const [data, { fetching }] = useQueryArtworks();

  return (
    <ArtworkGrid items={data?.artworks as Artwork[]} isLoading={fetching} />
  );
};

export const CreatedArtwoks = () => {
  const { publicKey } = useWallet();

  const variables = useMemo(
    () => ({ creatorId: publicKey?.toBase58() }),
    [publicKey],
  );
  const [data, { fetching }] = useQueryArtworks(variables);

  return (
    <ArtworkGrid items={data?.artworks as Artwork[]} isLoading={fetching} />
  );
};

export const OwnedArtwoks = () => {
  const { publicKey } = useWallet();

  const variables = useMemo(
    () => ({ ownerId: publicKey?.toBase58() }),
    [publicKey],
  );
  const [data, { fetching }] = useQueryArtworks(variables);

  return (
    <ArtworkGrid items={data?.artworks as Artwork[]} isLoading={fetching} />
  );
};

export const ArtworksView = () => {
  const [activeKey, setActiveKey] = useState(ArtworkViewState.Metaplex);
  const { connected } = useWallet();

  useEffect(() => {
    if (connected) {
      setActiveKey(ArtworkViewState.Owned);
    } else {
      setActiveKey(ArtworkViewState.Metaplex);
    }
  }, [connected, setActiveKey]);

  return (
    <Layout style={{ margin: 0, marginTop: 30 }}>
      <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
        <Col style={{ width: '100%', marginTop: 10 }}>
          <Row>
            <Tabs
              activeKey={activeKey}
              onTabClick={key => setActiveKey(key as ArtworkViewState)}
            >
              <TabPane
                tab={<span className="tab-title">All</span>}
                key={ArtworkViewState.Metaplex}
              >
                <AllArtwoks />
              </TabPane>
              {connected && (
                <TabPane
                  tab={<span className="tab-title">Owned</span>}
                  key={ArtworkViewState.Owned}
                >
                  <OwnedArtwoks />
                </TabPane>
              )}
              {connected && (
                <TabPane
                  tab={<span className="tab-title">Created</span>}
                  key={ArtworkViewState.Created}
                >
                  <CreatedArtwoks />
                </TabPane>
              )}
            </Tabs>
          </Row>
        </Col>
      </Content>
    </Layout>
  );
};
