import React, { useEffect, useMemo, useState } from 'react';
import { Col, Row, Button } from 'antd';

import './index.less';
import { AuctionView, useAuctions, useArt } from '../../hooks';
import { ArtContent } from '../ArtContent';
import { AuctionCard } from '../AuctionCard';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { MetaAvatar } from '../MetaAvatar';
import AuctionData from '../../config/auctions.json';

interface IPreSaleBanner {
  auction?: AuctionView;
}

export const PreSaleBanner = ({ auction }: IPreSaleBanner) => {
  const art = useArt(auction?.thumbnail.metadata.pubkey);
  const auctionData = AuctionData as any;

  if (!auction) {
    return null;
  }

  return (
    <Row className="presale">
      <Col md={12} className="explore">
        <ArtContent
          category={art.category}
          uri={art.image}
          extension={art.image}
          files={art.files}
          className="artwork-image"
        />
      </Col>
      <Col md={12}>
        <h2 className="art-title">
          {auctionData[auction.auction.pubkey.toBase58()]
            ? auctionData[auction.auction.pubkey.toBase58()].name
            : art.title}
        </h2>
        {auction && (
          <AuctionCard
            auctionView={auction}
            style={{
              background: 'transparent',
              width: '100%',
              padding: 0,
              margin: 0,
            }}
            hideDefaultAction={true}
            action={
              <>
                <Link to={`/auction/${auction.auction.pubkey.toBase58()}`}>
                  <Button
                    type="primary"
                    size="large"
                    className="action-btn"
                    style={{ maxWidth: 290 }}
                  >
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
