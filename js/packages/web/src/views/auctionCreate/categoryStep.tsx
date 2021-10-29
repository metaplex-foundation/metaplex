import { Button, Col, Row } from 'antd';
import React from 'react';
import { AuctionCategory } from '.';
import useWindowDimensions from '../../utils/layout';

export const CategoryStep = (props: {
  confirm: (category: AuctionCategory) => void;
}) => {
  const { width } = useWindowDimensions();
  return (
    <>
      <Row>
        <h2>List an item</h2>
        <p>
          First time listing on Metaplex? <a>Read our sellers&apos; guide.</a>
        </p>
      </Row>
      <Row justify={width < 768 ? 'center' : 'start'}>
        <Col>
          <Row>
            <Button
              size="large"
              onClick={() => props.confirm(AuctionCategory.InstantSale)}
            >
              <div>
                <div>Instant Sale</div>
                <div>
                  At a fixed price, sell a single Master NFT or copies of it
                </div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              size="large"
              onClick={() => props.confirm(AuctionCategory.Limited)}
            >
              <div>
                <div>Limited Edition</div>
                <div>Sell a limited copy or copies of a single Master NFT</div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              size="large"
              onClick={() => props.confirm(AuctionCategory.Open)}
            >
              <div>
                <div>Open Edition</div>
                <div>Sell unlimited copies of a single Master NFT</div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              size="large"
              onClick={() => props.confirm(AuctionCategory.Tiered)}
            >
              <div>
                <div>Tiered Auction</div>
                <div>
                  Participants get unique rewards based on their leaderboard
                  rank
                </div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              size="large"
              onClick={() => props.confirm(AuctionCategory.Single)}
            >
              <div>
                <div>Sell an Existing Item</div>
                <div>
                  Sell an existing item in your NFT collection, including Master
                  NFTs
                </div>
              </div>
            </Button>
          </Row>
        </Col>
      </Row>
    </>
  );
};
