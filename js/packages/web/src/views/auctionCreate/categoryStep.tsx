import { Button, Col, Row, Space } from 'antd';
import React from 'react';
import { AuctionCategory, AuctionState } from '.';

export const CategoryStep = (props: {
  confirm: () => void;
  attributes: AuctionState;
  freshAttributes: AuctionState;
  setAttributes: (state: AuctionState) => void;
}) => {
  return (
    <Space className="metaplex-fullwidth" direction="vertical">
      <h2>List an NFT</h2>
      <Row>
        <Col span={11}>
          <Space className="metaplex-fullwidth" direction="vertical">
            {[
              {
                cat: AuctionCategory.InstantSale,
                title: 'Instant Sale',
                desc: 'At a fixed price, sell a single Master NFT or copies of it',
              },
              {
                cat: AuctionCategory.Single,
                title: 'Sell an Existing NFT',
                desc: 'Sell an existing item in your NFT collection, including Master NFTs',
              },
              {
                cat: AuctionCategory.Limited,
                title: 'Limited Edition',
                desc: 'Sell a limited copy or copies of a single Master NFT',
              },
              // {
              //   cat: AuctionCategory.Open,
              //   title: 'Open Edition',
              //   desc: 'Sell unlimited copies of a single Master NFT',
              // },
              // {
              //   cat: AuctionCategory.Tiered,
              //   title: 'Tiered Auction',
              //   desc: 'Participants get unique rewards based on their leaderboard rank',
              // },
            ].map(({ cat, title, desc }) => (
              <Button
                key={cat}
                className="metaplex-button-jumbo metaplex-fullwidth"
                type="ghost"
                size="large"
                onClick={() => {
                  if (cat !== props.attributes.category) {
                    props.setAttributes({
                      ...props.freshAttributes,
                      category: cat,
                    });
                  }
                  props.confirm();
                }}
              >
                <div>{title}</div>
                <div>{desc}</div>
              </Button>
            ))}
          </Space>
        </Col>
      </Row>
    </Space>
  );
};
