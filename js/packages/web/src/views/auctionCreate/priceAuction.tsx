import { Button, Input, Space } from 'antd';
import React from 'react';
import { AuctionCategory, AuctionState } from '.';

export const PriceAuction = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  return (
    <Space className="metaplex-fullwidth" direction="vertical">
      <div>
        <h2>Price</h2>
        <p>Set the price for your auction.</p>
      </div>

      {props.attributes.category === AuctionCategory.Open && (
        <label>
          <span>Price</span>
          <span>
            This is the fixed price that everybody will pay for your
            Participation NFT.
          </span>
          <Input
            type="number"
            min={0}
            autoFocus
            placeholder="Fixed Price"
            prefix="◎"
            suffix="SOL"
            onChange={info =>
              props.setAttributes({
                ...props.attributes,
                // Do both, since we know this is the only item being sold.
                participationFixedPrice: parseFloat(info.target.value),
                priceFloor: parseFloat(info.target.value),
              })
            }
          />
        </label>
      )}
      {props.attributes.category !== AuctionCategory.Open && (
        <label>
          <h3>Price Floor</h3>
          <p>This is the starting bid price for your auction.</p>
          <Input
            type="number"
            min={0}
            autoFocus
            placeholder="Price"
            prefix="◎"
            suffix="SOL"
            onChange={info =>
              props.setAttributes({
                ...props.attributes,
                priceFloor: parseFloat(info.target.value),
              })
            }
          />
        </label>
      )}
      <label>
        <h3>Tick Size</h3>
        <p>All bids must fall within this price increment.</p>
        <Input
          type="number"
          min={0}
          placeholder="Tick size in SOL"
          prefix="◎"
          suffix="SOL"
          onChange={info =>
            props.setAttributes({
              ...props.attributes,
              priceTick: parseFloat(info.target.value),
            })
          }
        />
      </label>

      <Button
        className="metaplex-fullwidth"
        type="primary"
        size="large"
        onClick={props.confirm}
      >
        Continue
      </Button>
    </Space>
  );
};
