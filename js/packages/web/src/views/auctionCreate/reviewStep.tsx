import { LoadingOutlined } from '@ant-design/icons';
import { Connection } from '@solana/web3.js';
import { Button, Col, Divider, Row, Space, Spin, Statistic } from 'antd';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { AuctionCategory, AuctionState } from '.';
import { AmountLabel } from '../../components/AmountLabel';
import { ArtCard } from '../../components/ArtCard';

export const ReviewStep = (props: {
  confirm: () => void;
  attributes: AuctionState;
  setAttributes: Function;
  connection: Connection;
}) => {
  const [cost, setCost] = useState(0);
  useEffect(() => {
    // const rentCall = Promise.all([
    //   props.connection.getMinimumBalanceForRentExemption(MintLayout.span),
    //   props.connection.getMinimumBalanceForRentExemption(MAX_METADATA_LEN),
    // ]);
    // TODO: add
    // TODO: ^ what does that mean
  }, [setCost]);

  const item = props.attributes.items?.[0];

  return (
    <Space className="metaplex-fullwidth" direction="vertical">
      <h2>Review and list</h2>
      <p>Review your listing before publishing.</p>
      <Row justify="space-around">
        <Col span={6}>
          {item?.metadata.info && (
            <ArtCard
              pubkey={item.metadata.pubkey}
              small={true}
              hoverable={false}
            />
          )}
        </Col>
        <Col span={8}>
          <Statistic
            title="Copies"
            value={
              props.attributes.editions === undefined
                ? 'Unique'
                : props.attributes.editions
            }
          />
          {cost ? (
            <AmountLabel title="Cost to Create" amount={cost} />
          ) : (
            <Spin indicator={<LoadingOutlined />} />
          )}
        </Col>
      </Row>
      <div>
        <Divider />
        <Statistic
          title="Start date"
          value={
            props.attributes.startSaleTS
              ? moment
                  .unix(props.attributes.startSaleTS)
                  .format('dddd, MMMM Do YYYY, h:mm a')
              : 'Right after successfully published'
          }
        />
        <br />
        {props.attributes.startListTS && (
          <Statistic
            title="Listing go live date"
            value={moment
              .unix(props.attributes.startListTS)
              .format('dddd, MMMM Do YYYY, h:mm a')}
          />
        )}
        <Divider />
        <Statistic
          title="Sale ends"
          value={
            props.attributes.endTS
              ? moment
                  .unix(props.attributes.endTS)
                  .format('dddd, MMMM Do YYYY, h:mm a')
              : 'Until sold'
          }
        />
      </div>
      <Button
        className="metaplex-fullwidth"
        type="primary"
        size="large"
        onClick={() => {
          props.setAttributes({
            ...props.attributes,
            startListTS: props.attributes.startListTS || moment().unix(),
            startSaleTS: props.attributes.startSaleTS || moment().unix(),
          });
          props.confirm();
        }}
      >
        {props.attributes.category === AuctionCategory.InstantSale
          ? 'List for Sale'
          : 'Publish Auction'}
      </Button>
    </Space>
  );
};
