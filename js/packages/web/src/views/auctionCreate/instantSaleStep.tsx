import { Creator } from '@oyster/common';
import { Button, Col, Input, Row, Select } from 'antd';
import React, { useCallback, useMemo } from 'react';
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
  const copiesEnabled = useMemo(
    () => !!attributes?.items?.[0]?.masterEdition?.info?.maxSupply,
    [attributes?.items?.[0]],
  );
  const artistFilter = useCallback(
    (i: SafetyDepositDraft) =>
      !(i.metadata.info.data.creators || []).some((c: Creator) => !c.verified),
    [],
  );

  const isLimitedEdition =
    attributes.instantSaleType === InstantSaleType.Limited;
  const shouldRenderSelect = attributes.items.length > 0;

  return (
    <>
      <Row>
        <h2>Select which item to sell:</h2>
      </Row>

      <Row>
        <Col xl={24}>
          <ArtSelector
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
                defaultValue={
                  attributes.instantSaleType || InstantSaleType.Single
                }
                onChange={value =>
                  setAttributes({
                    ...attributes,
                    instantSaleType: value,
                  })
                }
              >
                <Option value={InstantSaleType.Single}>
                  Sell unique token
                </Option>
                {copiesEnabled && (
                  <Option value={InstantSaleType.Limited}>
                    Sell limited number of copies
                  </Option>
                )}
                {!copiesEnabled && (
                  <Option value={InstantSaleType.Open}>
                    Sell unlimited number of copies
                  </Option>
                )}
              </Select>
              {isLimitedEdition && (
                <>
                  <span>
                    Each copy will be given unique edition number e.g. 1 of 30
                  </span>
                  <Input
                    autoFocus
                    placeholder="Enter number of copies sold"
                    allowClear
                    onChange={info =>
                      setAttributes({
                        ...attributes,
                        editions: parseInt(info.target.value),
                      })
                    }
                  />
                </>
              )}
            </label>
          )}

          <label>
            <span>Price</span>
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
        </Col>
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={() => {
            confirm();
          }}
        >
          Continue
        </Button>
      </Row>
    </>
  );
};
