import { Creator } from '@oyster/common';
import { Button, Col, Input, Row } from 'antd';
import React from 'react';
import { AuctionCategory, AuctionState } from '.';
import { SafetyDepositDraft } from '../../actions/createAuctionManager';
import { ArtSelector } from './artSelector';

export const CopiesStep = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
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

  return (
    <>
      <Row>
        <h2>Select which item to sell</h2>
        <p>Select the item(s) that you want to list.</p>
      </Row>
      <Row>
        <Col xl={24}>
          <ArtSelector
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
                Each copy will be given unique edition number e.g. 1 of 30
              </span>
              <Input
                autoFocus
                placeholder="Enter number of copies sold"
                allowClear
                onChange={info =>
                  props.setAttributes({
                    ...props.attributes,
                    editions: parseInt(info.target.value),
                  })
                }
              />
            </label>
          )}
        </Col>
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={() => {
            props.confirm();
          }}
        >
          Continue to Terms
        </Button>
      </Row>
    </>
  );
};
