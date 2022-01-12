import { WRAPPED_SOL_MINT } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import { Alert, Button, Col, Divider, Row, Space, Statistic } from 'antd';
import moment from 'moment';
import React, { useState } from 'react';
import { AuctionCategory, AuctionState } from '.';
import { ArtCard } from '../../components/ArtCard';
import { useUserBalance } from '../../hooks';
import { AddFundsModal } from '../../components/CurrentUserBadge';

export const ReviewStep = (props: {
  confirm: () => void;
  attributes: AuctionState;
  setAttributes: Function;
  connection: Connection;
}) => {
  const wallet = useWallet();
  const [isShowingModal, setIsShowingModal] = useState(false);
  const { balance } = useUserBalance(WRAPPED_SOL_MINT.toString());
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
      {balance < 0.05 ? (
        <>
          <Alert
            message={`Your current SOL balance is currently below 0.05; this transaction may fail.`}
            type="warning"
            action={
              <Space>
                <Button type="link" onClick={() => setIsShowingModal(true)}>
                  Get more SOL
                </Button>
              </Space>
            }
            showIcon
            closable
          />
          <AddFundsModal
            setShowAddFundsModal={setIsShowingModal}
            showAddFundsModal={isShowingModal}
            publicKey={wallet.publicKey!}
            balance={balance}
          />
        </>
      ) : null}
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
