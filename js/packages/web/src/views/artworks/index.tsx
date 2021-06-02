import React, { useEffect, useState } from 'react';
import { ArtCard } from '../../components/ArtCard';
import { Layout, Row, Col, Tabs } from 'antd';
import Masonry from 'react-masonry-css';
import { Link } from 'react-router-dom';
import { useUserArts } from '../../hooks';
import { useMeta } from '../../contexts';
import { CardLoader } from '../../components/MyLoader';
import { useWallet } from '@oyster/common';

const { TabPane } = Tabs;

const { Content } = Layout;

export enum ArtworkViewState {
  Metaplex = '0',
  Owned = '1',
  Created = '2',
}

export const ArtworksView = () => {
  const { connected } = useWallet();
  const ownedMetadata = useUserArts();
  const { metadata } = useMeta();
  const [activeKey, setActiveKey] = useState(ArtworkViewState.Owned);
  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  const items =
    activeKey === ArtworkViewState.Metaplex
      ? metadata
      : ownedMetadata.map(m => m.metadata);

  useEffect(() => {
    if(connected) {
      setActiveKey(ArtworkViewState.Owned);
    } else {
      setActiveKey(ArtworkViewState.Metaplex);
    }
  }, [connected, setActiveKey]);

  const artworkGrid = (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {items.length > 0 ?
        items.map((m, idx) => {
          const id = m.pubkey.toBase58();
          return (
            <Link to={`/art/${id}`} key={idx}>
              <ArtCard key={id} pubkey={m.pubkey} preview={false} />
            </Link>
          );
        })
      :
        [...Array(10)].map((_, idx) => <CardLoader key={idx}/>)
      }
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
              {connected && (<TabPane
                tab={<span className="tab-title">Owned</span>}
                key={ArtworkViewState.Owned}
              >
                {artworkGrid}
              </TabPane>)}
              {connected && (<TabPane
                tab={<span className="tab-title">Created</span>}
                key={ArtworkViewState.Created}
              >
                {artworkGrid}
              </TabPane>)}
              <TabPane
                tab={<span className="tab-title">All</span>}
                key={ArtworkViewState.Metaplex}
              >
                {artworkGrid}
              </TabPane>
            </Tabs>
          </Row>
        </Col>
      </Content>
    </Layout>
  );
};
