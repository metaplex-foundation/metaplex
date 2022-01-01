import { Col, Divider, Row,Layout, Tabs } from 'antd';

import { Link, useParams } from 'react-router-dom';
import { ArtCard } from '../../components/ArtCard';
import { CardLoader } from '../../components/MyLoader';
import { useCreator, useCreatorArts } from '../../hooks';
import React, { useState } from 'react';


//extra
import { useAuctionsList } from './hooks/useAuctionsList';
import { useMeta } from '../../contexts';
import { AuctionRenderCard } from '../../components/AuctionRenderCard';

const { TabPane } = Tabs;
const { Content } = Layout;

export enum LiveAuctionViewState {
  All = '0',
  Participated = '1',
  Ended = '2',
  Resale = '3',
}




export const ArtistView = () => {
  const { id } = useParams<{ id: string }>();
  const creator = useCreator(id);
  const artwork = useCreatorArts(id);

  

  //extra
  const { isLoading } = useMeta();
  const [activeKey, setActiveKey] = useState(LiveAuctionViewState.All);
  const { auctions, hasResaleAuctions } = useAuctionsList(activeKey);


  const artworkGrid = (
    <div className="artwork-grid">
      {artwork.length > 0
        ? artwork.map((m, idx) => {
            const id = m.pubkey;
            return (
              <Link to={`/art/${id}`} key={idx}>
                <ArtCard key={id} pubkey={m.pubkey} preview={false} artView={true}/>
              </Link>
            );
          })
        : [...Array(6)].map((_, idx) => <CardLoader key={idx} />)}
    </div>
  );

  return (
    <>
      <Col>
        <Divider />
        <Row
          style={{ margin: '0 30px', textAlign: 'left', fontSize: '1.4rem' }}
        >
          <Col span={24}>
            <h2>
            My NFT Space
            </h2>
            <br />
            <div className="info-header">ABOUT THE COLLECTION</div>
            <p>A collection of 1,111 Solana NFTs with 4 different variants. Each variant has it's own set of benefits. Every “MY NFT Space Badge” yields certain amount of $NSPACE Token a day for the next 10 years.</p>
            <br />
            <div className="info-header"></div>
            <div className="artwork-grid">
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
              </div>
          </Col>
        </Row>
      </Col>
    </>
  );
};
