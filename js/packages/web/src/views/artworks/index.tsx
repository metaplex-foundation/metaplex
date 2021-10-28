import React, { useEffect, useState } from 'react';
import { Layout, Row, Col, Tabs } from 'antd';
import { useWallet } from '@solana/wallet-adapter-react';
import { Link } from 'react-router-dom';
import Masonry from 'react-masonry-css';
import { useMeta } from '../../contexts';
import { ArtCard } from '../../components/ArtCard';
import { CardLoader } from '../../components/MyLoader';
import { useCreatorArts, useUserArts } from '../../hooks';
import { getMetdataByCreator } from '../../hooks/getData';
import { pubkeyToString } from '@oyster/common';
import { Spinner } from 'react-bootstrap';

const { TabPane } = Tabs;

const { Content } = Layout;

let loading = true;
export enum ArtworkViewState {
  Metaplex = '0',
  Owned = '1',
  Created = '2',
}

export const ArtworksView = () => {
  const { connected, publicKey } = useWallet();
  const ownedMetadata = useUserArts();
  const createdMetadata = useCreatorArts(publicKey?.toBase58() || '');

  const key = pubkeyToString(publicKey);
  const [filtered, setFiltered] = useState<any>([]);
  useEffect(() => {
    if (!key) return;
    getMetdataByCreator(key).then(metadata => {
      if (metadata && metadata.length > 0) {
        loading = false;
        setFiltered(metadata);
      }
    });
  }, [key]);

  const [activeKey, setActiveKey] = useState(ArtworkViewState.Metaplex);
  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  const items =
    activeKey === ArtworkViewState.Owned
      ? ownedMetadata.map(m => m.metadata)
      : activeKey === ArtworkViewState.Created
      ? createdMetadata.artwork
      : filtered;

  useEffect(() => {
    if (connected) {
      setActiveKey(ArtworkViewState.Owned);
    } else {
      setActiveKey(ArtworkViewState.Metaplex);
    }
  }, [connected, setActiveKey]);

  const artworkGrid = (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column Spinner-item"
    >
      {!loading
        ? items.map((m, idx) => {
            const id = m.pubkey;
            return (
              <Link to={`/art/${id}`} key={idx}>
                <ArtCard
                  key={id}
                  pubkey={m.pubkey}
                  preview={false}
                  height={250}
                  width={250}
                />
              </Link>
            );
          })
        :(
          <Spinner animation="border" role="status">
            <span className="visually-hidden"></span>
          </Spinner>
      )}
    </Masonry>
  );

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
