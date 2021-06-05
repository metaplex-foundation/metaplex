import React from 'react';
import { Col, Row, Button } from 'antd';

import './index.less';
import { AuctionView, useArt } from '../../hooks';
import { ArtContent } from '../ArtContent';
import { AuctionCard } from '../AuctionCard';
import { Link } from 'react-router-dom';
import { MetaAvatar } from '../MetaAvatar';

interface IPreSaleBanner {
  auction?: AuctionView;
}

export const PreSaleBanner = ({
  auction,
}: IPreSaleBanner) => {
  const art = useArt(auction?.thumbnail.metadata.pubkey);

  if (!auction) {
    return null;
  }

  return (
    <Row style={{ height: 400 }}>
      <Col span={12} style={{ display: 'flex' }}>
          <ArtContent
            category={art.category}
            uri={art.image}
            extension={art.image}
            className="artwork-image"
          />
      </Col>
      <Col span={12} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2 className="art-title">{art.title}</h2>
        <MetaAvatar creators={art.creators} showMultiple={true} />
        {auction && (
            <AuctionCard auctionView={auction}
              style={{ background: 'transparent', width: '100%', padding: 0, margin: 0 }}
              hideDefaultAction={true}
              action={<>
              <Link to={`/auction/${auction.auction.pubkey.toBase58()}`}>
                <Button type="primary"
                        size="large"
                        className="action-btn"
                        style={{ maxWidth: 290 }}>
                  Go to auction
                </Button>
              </Link>
            </>} />)}
      </Col>
    </Row>
  );
};
