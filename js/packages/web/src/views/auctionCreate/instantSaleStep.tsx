import { Creator } from '@oyster/common';
import { Button, Input, Row, Select, Space } from 'antd';
import { isNil } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { AuctionState, InstantSaleType } from '.';
import { SafetyDepositDraft } from '../../actions/createAuctionManager';
import { ArtSelector } from './artSelector';

const { Option } = Select;

export const InstantSaleStep = ({
  attributes,
  setAttributes,
  confirm,
}: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  const [editionError, setEditionError] = useState<string>();
  const nft = attributes?.items[0];
  const isEdition = useMemo(() => !!nft?.edition, [nft]);
  const masterEdition = useMemo(() => nft?.masterEdition, [nft]);
  const availableSupply = useMemo(
    () => (isEdition ? 0 : (masterEdition?.info?.supply.toNumber() as number)),
    [masterEdition, isEdition],
  );
  const hasUlimatedPrints = useMemo(
    () => !isEdition && isNil(masterEdition?.info?.maxSupply),
    [masterEdition, isEdition],
  );
  const artistFilter = useCallback(
    (i: SafetyDepositDraft) =>
      !(i.metadata.info.data.creators || []).some((c: Creator) => !c.verified),
    [],
  );
  const shouldRenderSelect = attributes.items.length > 0;

  return (
    <Space className="metaplex-fullwidth" direction="vertical">
      <h2>Select which item to sell:</h2>

      <ArtSelector
        className="metaplex-fullwidth"
        filter={artistFilter}
        selected={attributes.items}
        setSelected={items => {
          setAttributes({ ...attributes, items });
        }}
        allowMultiple={false}
      >
        Select NFT
      </ArtSelector>

      {shouldRenderSelect && (
        <label>
          <Select
            defaultValue={attributes.instantSaleType || InstantSaleType.Single}
            onChange={value => {
              setEditionError(undefined);
              setAttributes({
                ...attributes,
                instantSaleType: value,
              });
            }}
          >
            <Option value={InstantSaleType.Single}>Sell unique token</Option>
            {availableSupply > 0 && (
              <Option value={InstantSaleType.Limited}>
                Sell limited number of copies
              </Option>
            )}
            {hasUlimatedPrints && (
              <Option value={InstantSaleType.Open}>
                Sell unlimited number of copies
              </Option>
            )}
          </Select>
          {availableSupply > 0 && (
            <>
              <span>
                Each copy will be given unique edition number e.g. 1 of 30
              </span>
              <Input
                autoFocus
                placeholder="Enter number of copies sold"
                allowClear
                onChange={info => {
                  setEditionError(undefined);
                  const editions = parseInt(info.target.value);

                  if (editions > availableSupply) {
                    setEditionError(
                      `The NFT can only generate ${availableSupply} more editions. Please lower the copy count.`,
                    );
                    return;
                  }

                  setAttributes({
                    ...attributes,
                    editions,
                  });
                }}
              />
            </>
          )}
        </label>
      )}
      {editionError && (
        <Row>
          <span className="ant-typography ant-typography-danger">*</span>{' '}
          {editionError}
        </Row>
      )}

      <label>
        <h3>Price</h3>
        <span>This is the instant sale price for your item.</span>
        <Input
          type="number"
          min={0}
          autoFocus
          placeholder="Price"
          prefix="◎"
          suffix="SOL"
          onChange={info =>
            setAttributes({
              ...attributes,
              priceFloor: parseFloat(info.target.value),
              instantSalePrice: parseFloat(info.target.value),
            })
          }
        />
      </label>
      <Button
        className="metaplex-fullwidth"
        type="primary"
        size="large"
        disabled={!!editionError}
        onClick={() => {
          confirm();
        }}
      >
        Continue
      </Button>
    </Space>
  );
};
