import { Button, Space } from 'antd';
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
    <Space className="metaplex-fullwidth" direction="vertical">
      <div>
        <h2>Participation NFT</h2>
        <p>
          Provide NFT that will be awarded as an Open Edition NFT for auction
          participation.
        </p>
      </div>

      <ArtSelector
        className="metaplex-fullwidth"
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

      <p>
        NOTE: Participation NFTs will be provided free of charge to bidders.
      </p>

      <Button
        className="metaplex-fullwidth"
        type="primary"
        size="large"
        onClick={props.confirm}
      >
        Continue to Review
      </Button>
    </Space>
  );
};
