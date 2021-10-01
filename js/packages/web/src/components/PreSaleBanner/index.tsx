import React from 'react';
import { Col, Row, Button, Skeleton } from 'antd';

import { Auction } from '../../hooks';
import { ArtContent } from '../ArtContent/next';
import { Link } from 'react-router-dom';
import { AuctionNumbers } from '../AuctionNumbers';

interface IPreSaleBanner {
  auction?: Auction;
  isLoading?: boolean;
}

export const PreSaleBanner = ({ auction, isLoading }: IPreSaleBanner) => {
  const art = auction?.thumbnail;

  if (isLoading) {
    return <Skeleton />;
  }

  return (
    <Row className="presale">
      <Col md={12} className="explore">
        <ArtContent
          uri={art?.uri}
          className="artwork-image"
          allowMeshRender={true}
        />
      </Col>
      <Col md={12} className="presale-info">
        <h2 className="art-title" style={{ margin: 0 }}>
          {art?.title}
        </h2>
        {auction && (
          <Col
            style={{
              width: '100%',
            }}
          >
            <AuctionNumbers auction={auction} />
            <Link to={`/auction/${auction.pubkey}`}>
              <Button
                type="primary"
                size="large"
                className="action-btn"
                style={{ maxWidth: 290, marginBottom: 0, marginTop: '1em' }}
              >
                Go to auction
              </Button>
            </Link>
          </Col>
        )}
      </Col>
    </Row>
  );
};
