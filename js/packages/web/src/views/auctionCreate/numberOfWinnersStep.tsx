import { Button, Input, Space } from 'antd';
import React from 'react';
import { AuctionState } from '.';

export const NumberOfWinnersStep = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  return (
    <Space className="metaplex-fullwidth" direction="vertical">
      <div>
        <h2>Tiered Auction</h2>
        <p>Create a Tiered Auction</p>
      </div>

      <label>
        <h3>How many participants can win the auction?</h3>
        <p>This is the number of spots in the leaderboard.</p>
        <Input
          type="number"
          autoFocus
          placeholder="Number of spots in the leaderboard"
          onChange={info =>
            props.setAttributes({
              ...props.attributes,
              winnersCount: parseInt(info.target.value),
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
