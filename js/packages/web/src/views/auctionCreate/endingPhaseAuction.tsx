import { Button, Input, Select, Space } from 'antd';
import React from 'react';
import { AuctionState } from '.';

const { Option } = Select;

export const EndingPhaseAuction = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  return (
    <Space className="metaplex-fullwidth" direction="vertical">
      <div>
        <h2>Ending Phase</h2>
        <p>Set the terms for your auction.</p>
      </div>

      <div>
        <h3>Auction Duration</h3>
        <p>This is how long the auction will last for.</p>
        <Input
          addonAfter={
            <Select
              defaultValue={props.attributes.auctionDurationType}
              onChange={value =>
                props.setAttributes({
                  ...props.attributes,
                  auctionDurationType: value,
                })
              }
            >
              <Option value="minutes">Minutes</Option>
              <Option value="hours">Hours</Option>
              <Option value="days">Days</Option>
            </Select>
          }
          autoFocus
          type="number"
          placeholder="Set the auction duration"
          defaultValue={props.attributes.auctionDuration}
          onChange={info =>
            props.setAttributes({
              ...props.attributes,
              auctionDuration: parseInt(info.target.value),
            })
          }
        />
      </div>

      <div>
        <h3>Gap Time</h3>
        <p>
          The final phase of the auction will begin when there is this much time
          left on the countdown. Any bids placed during the final phase will
          extend the end time by this same duration.
        </p>
        <Input
          addonAfter={
            <Select
              defaultValue={props.attributes.gapTimeType}
              onChange={value =>
                props.setAttributes({
                  ...props.attributes,
                  gapTimeType: value,
                })
              }
            >
              <Option value="minutes">Minutes</Option>
              <Option value="hours">Hours</Option>
              <Option value="days">Days</Option>
            </Select>
          }
          type="number"
          placeholder="Set the gap time"
          onChange={info =>
            props.setAttributes({
              ...props.attributes,
              gapTime: parseInt(info.target.value),
            })
          }
        />
      </div>

      <label>
        <h3>Tick Size for Ending Phase</h3>
        <p>
          In order for winners to move up in the auction, they must place a bid
          that’s at least this percentage higher than the next highest bid.
        </p>
        <Input
          type="number"
          placeholder="Percentage"
          suffix="%"
          onChange={info =>
            props.setAttributes({
              ...props.attributes,
              tickSizeEndingPhase: parseInt(info.target.value),
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
