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
      <div className=" space-y-4 max-w-lg">
        {[
          {
            cat: AuctionCategory.Single,
            title: 'Auction',
            desc: 'Sell a single NFT from your collection',
          },
          {
            cat: AuctionCategory.InstantSale,
            title: 'Fixed price',
            desc: 'Sell a single Master NFT or multiple copies of it',
          },
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
            <div className="text-xl ">{title}</div>
            <div className="text-sm">{desc}</div>
          </Button>
        ))}
      </div>
    </Space>
  );
};
