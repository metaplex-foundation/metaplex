import { Creator } from '@oyster/common';
import { Button, Input, Row, Space } from 'antd';
import React, { useState } from 'react';
import { AuctionCategory, AuctionState } from '.';
import { SafetyDepositDraft } from '../../actions/createAuctionManager';
import { ArtSelector } from './artSelector';

const MAX_EDITIONS_ALLOWED = 100;

export const CopiesStep = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  const [editionsError, setEditionsError] = useState<string>();
  const artistFilter = (i: SafetyDepositDraft) =>
    !(i.metadata.info.data.creators || []).find((c: Creator) => !c.verified);
  let filter: (i: SafetyDepositDraft) => boolean = () => true;
  if (props.attributes.category === AuctionCategory.Limited) {
    filter = (i: SafetyDepositDraft) =>
      !!i.masterEdition && !!i.masterEdition.info.maxSupply;
  } else if (props.attributes.category === AuctionCategory.Open) {
    filter = (i: SafetyDepositDraft) =>
      !!(
        i.masterEdition &&
        (i.masterEdition.info.maxSupply === undefined ||
          i.masterEdition.info.maxSupply === null)
      );
  }

  const overallFilter = (i: SafetyDepositDraft) => filter(i) && artistFilter(i);

  const masterEdition = props.attributes.items[0]?.masterEdition;

  let maxSupply = 0;
  let availableSupply = 0;

  if (masterEdition) {
    maxSupply = masterEdition.info.maxSupply?.toNumber() as number;
    availableSupply = (maxSupply -
      masterEdition.info.supply?.toNumber()) as number;
  }

  return (
    <Space className="metaplex-fullwidth" direction="vertical">
      <div>
        <h2>Select which item to sell</h2>
        <p>Select the item(s) that you want to list.</p>
      </div>

      <ArtSelector
        className="metaplex-fullwidth"
        filter={overallFilter}
        selected={props.attributes.items}
        setSelected={items => {
          props.setAttributes({ ...props.attributes, items });
        }}
        allowMultiple={false}
      >
        Select NFT
      </ArtSelector>

      {props.attributes.category === AuctionCategory.Limited && (
        <label>
          <span>How many copies do you want to create?</span>
          <span>
            Each copy will be given unique edition number e.g. 1 of 30. Maximum:{' '}
            {MAX_EDITIONS_ALLOWED}
          </span>
          <Input
            autoFocus
            placeholder="Enter number of copies sold"
            allowClear
            onChange={info => {
              const editions = parseInt(info.target.value);
              setEditionsError(undefined);

              if (editions > MAX_EDITIONS_ALLOWED) {
                setEditionsError(
                  `The onchain program can only auction off ${MAX_EDITIONS_ALLOWED} NFTs at a time. Please lower the edition supply.`,
                );
                return;
              }

              if (editions > availableSupply) {
                setEditionsError(
                  `${editions} is greater than the available supply of ${availableSupply} on the NFT. Please lower the edition supply.`,
                );
                return;
              }

              props.setAttributes({
                ...props.attributes,
                editions,
              });
            }}
          />
          {editionsError && (
            <Row>
              <span className="ant-typography ant-typography-danger">*</span>{' '}
              {editionsError}
            </Row>
          )}
        </label>
      )}

      <Button
        className="metaplex-fullwidth"
        type="primary"
        size="large"
        disabled={!!editionsError}
        onClick={() => {
          props.confirm();
        }}
      >
        Continue to Terms
      </Button>
    </Space>
  );
};
