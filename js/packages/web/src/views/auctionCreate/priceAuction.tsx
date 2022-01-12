import { Button, InputNumber, Space } from 'antd';
import React, { useState } from 'react';
import { AuctionCategory, AuctionState } from '.';

export const PriceAuction = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  type InputState = number | null;
  const [price, setPrice] = useState<InputState>(null);
  const [tickSize, setTickSize] = useState<InputState>(null);
  const [priceError, setPriceError] = useState(false);

  const handlePriceError = (price: InputState, tick: InputState) => {
    const multiplier = 1000000;
    if (tick && price && (price * multiplier) % (tick * multiplier) !== 0) {
      setPriceError(true);
    } else {
      setPriceError(false);
    }
  };

  const handleInput = (input: number, isPrice: boolean) => {
    if (isPrice) {
      setPrice(input);
      handlePriceError(input, tickSize);
    } else {
      setTickSize(input);
      handlePriceError(price, input);
    }
  };

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
          <InputNumber<number>
            min={0}
            decimalSeparator="."
            className="metaplex-fullwidth"
            step="0.01"
            autoFocus
            placeholder="Fixed Price in SOL"
            onChange={price => {
              handleInput(price, true);
              props.setAttributes({
                ...props.attributes,
                // Do both, since we know this is the only item being sold.
                participationFixedPrice: price,
                priceFloor: price,
              });
            }}
            precision={2}
            formatter={x => (x ? `◎ ${x}` : '')}
          />
        </label>
      )}
      {props.attributes.category !== AuctionCategory.Open && (
        <label>
          <h3>Price Floor</h3>
          <p>This is the starting bid price for your auction.</p>
          <InputNumber<number>
            min={0}
            decimalSeparator="."
            className="metaplex-fullwidth"
            step="0.01"
            autoFocus
            placeholder="Price in SOL"
            onChange={price => {
              handleInput(price, true);
              props.setAttributes({
                ...props.attributes,
                priceFloor: price,
              });
            }}
            precision={2}
            formatter={x => (x ? `◎ ${x}` : '')}
          />
        </label>
      )}
      <label>
        <h3>Tick Size</h3>
        <p>All bids must fall within this price increment.</p>
        <InputNumber<number>
          min={0}
          decimalSeparator="."
          className="metaplex-fullwidth"
          step="0.01"
          autoFocus
          placeholder="Tick size in SOL"
          onChange={tick => {
            handleInput(tick, false);
            props.setAttributes({
              ...props.attributes,
              priceTick: tick,
            });
          }}
          precision={2}
          formatter={x => (x ? `◎ ${x}` : '')}
        />
      </label>

      {priceError && (
        <div className="error-message">
          Starting price must be an exact multiple of the tick size!
        </div>
      )}

      <Button
        className="metaplex-fullwidth metaplex-margin-top-4 metaplex-margin-bottom-4"
        type="primary"
        size="large"
        onClick={props.confirm}
        disabled={priceError}
      >
        Continue
      </Button>
    </Space>
  );
};
