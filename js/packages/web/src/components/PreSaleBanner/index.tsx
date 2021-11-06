import React from 'react';
import { Col, Row, Button, Skeleton } from 'antd';

import { AuctionView, useArt } from '../../hooks';
import { ArtContent } from '../ArtContent';
import { AuctionCard } from '../AuctionCard';
import { Link } from 'react-router-dom';
import { useMeta } from '../../contexts';

interface IPreSaleBanner {
  auction?: AuctionView;
}

export const PreSaleBanner = ({ auction }: IPreSaleBanner) => {
  const { isLoading } = useMeta();
  const id = auction?.thumbnail.metadata.pubkey;
  const art = useArt();

  if (isLoading) {
    return <Skeleton />;
  }

  return (
    <Row>
      <Col md={12}>
        <ArtContent pubkey={id} allowMeshRender={true} />
      </Col>
      <Col md={12}>
        <h2>{art.title}</h2>
        {auction && (
          <AuctionCard
            auctionView={auction}
            hideDefaultAction={true}
            action={
              <>
                <Link to={`/auction/${auction.auction.pubkey}`}>
                  <Button type="primary" size="large">
                    Go to auction
                  </Button>
                </Link>
              </>
            }
          />
        )}
      </Col>
    </Row>
  );
};
