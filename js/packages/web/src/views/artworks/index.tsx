import React, { useEffect, useState } from 'react';
import { ArtCard } from '../../components/ArtCard';
import { Layout, Row, Col, Tabs, Spin, Button } from 'antd';
import Masonry from 'react-masonry-css';
import { Link } from 'react-router-dom';
import { useCreatorArts, useUserArts } from '../../hooks';
import { useMeta } from '../../contexts';
import { loadMetaDataAndEditionsForCreators, useConnection } from '@oyster/common';
import { CardLoader } from '../../components/MyLoader';
import { useWallet } from '@solana/wallet-adapter-react';
import { LoadingOutlined } from '@ant-design/icons';


const { TabPane } = Tabs;

const { Content } = Layout;

export enum ArtworkViewState {
  Metaplex = '0',
  Owned = '1',
  Created = '2',
}

export const ArtworksView = () => {
  const { connected, publicKey } = useWallet();
  const ownedMetadata = useUserArts();
  const [loadingArt, setLoadingArt] = useState(true);
  const createdMetadata = useCreatorArts(publicKey?.toBase58() || '');
  const { metadata, whitelistedCreatorsByCreator, patchState } = useMeta();
  const connection = useConnection();
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
        ? createdMetadata
        : metadata;

  useEffect(() => {
    if (connected) {
      setActiveKey(ArtworkViewState.Owned);
    } else {
      setActiveKey(ArtworkViewState.Metaplex);
    }
  }, [connected, setActiveKey]);

  useEffect(() => {
    (async () => {
      const metadataState = await loadMetaDataAndEditionsForCreators(connection, whitelistedCreatorsByCreator);

      patchState(metadataState);
      setLoadingArt(false);
    })()
  }, [connection])

  const artworkGrid = (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {items.map((m, idx) => {
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
      })}
    </Masonry>
  );

  return (
    <Layout style={{ margin: 0, marginTop: 30 }}>
      <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
        <Col style={{ width: '100%', marginTop: 10 }}>
          <Row justify="end">
            {loadingArt ? (
              <div className="app-section--loading">
                <Spin indicator={<LoadingOutlined />} />
              </div>
            ) : (
              <>
                <Link to={`/auction/create/0`}>
                  <Button className="connector" size="large" type="primary">
                    Sell
                  </Button>
                </Link>
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
              </>
            )}
          </Row>
        </Col>
      </Content>
    </Layout>
  );
};
