import { Button, Col, Input, Row } from 'antd';
import React from 'react';
import { AuctionState } from '.';
import { SafetyDepositDraft } from '../../actions/createAuctionManager';
import { ArtSelector } from './artSelector';

export const ParticipationStep = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  return (
    <>
      <Row>
        <h2>Participation NFT</h2>
        <p>
          Provide NFT that will be awarded as an Open Edition NFT for auction
          participation.
        </p>
      </Row>
      <Row>
        <Col xl={24}>
          <ArtSelector
            filter={(i: SafetyDepositDraft) =>
              !!i.masterEdition && i.masterEdition.info.maxSupply === undefined
            }
            selected={
              props.attributes.participationNFT
                ? [props.attributes.participationNFT]
                : []
            }
            setSelected={items => {
              props.setAttributes({
                ...props.attributes,
                participationNFT: items[0],
              });
            }}
            allowMultiple={false}
          >
            Select Participation NFT
          </ArtSelector>
          <label>
            <span>Price</span>
            <span>
              This is an optional fixed price that non-winners will pay for your
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
                  participationFixedPrice: parseFloat(info.target.value),
                })
              }
            />
          </label>
        </Col>
      </Row>
      <Row>
        <Button type="primary" size="large" onClick={props.confirm}>
          Continue to Review
        </Button>
      </Row>
    </>
  );
};
