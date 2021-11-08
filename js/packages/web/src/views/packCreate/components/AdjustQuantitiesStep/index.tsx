import { PackDistributionType } from '@oyster/common';
import React, { memo, ReactElement } from 'react';
import { Input } from 'antd';

import ItemRow from '../ItemRow';
import SelectCard from '../SelectCard';

import { AdjustQuantitiesStepProps, InputType } from './interface';
import { DISTRIBUTION_TYPES_DATA } from './data';
import { SafetyDepositDraft } from '../../../../actions/createAuctionManager';

const AdjustQuantitiesStep = ({
  allowedAmountToRedeem,
  distributionType,
  weightByMetadataKey,
  supplyByMetadataKey,
  selectedItems,
  setPackState,
  isUnlimited,
}: AdjustQuantitiesStepProps): ReactElement => {
  const availableDistributionTypes = [
    ...(isUnlimited ? [PackDistributionType.Unlimited] : []),
    PackDistributionType.MaxSupply,
    PackDistributionType.Fixed,
  ];

  const shouldRenderSupplyInput =
    distributionType !== PackDistributionType.Unlimited;
  const shouldRenderWeightInput =
    distributionType !== PackDistributionType.MaxSupply;

  const handleRedeemAmountChange = (value: string): void => {
    setPackState({
      allowedAmountToRedeem: parseInt(value),
    });
  };

  const handleDistributionChange = (
    item: SafetyDepositDraft,
    value: string,
    inputType: InputType,
  ): void => {
    const number = Number(value);
    const pubKey = item.metadata.pubkey;

    if (inputType === InputType.weight) {
      return setPackState({
        weightByMetadataKey: {
          ...weightByMetadataKey,
          [pubKey]: number,
        },
      });
    }

    const maxSupply = item.masterEdition?.info.maxSupply?.toNumber();

    setPackState({
      supplyByMetadataKey: {
        ...supplyByMetadataKey,
        [pubKey]:
          maxSupply !== undefined && number > maxSupply ? maxSupply : number,
      },
    });
  };

  const handleDistributionTypeChange = (type: PackDistributionType): void => {
    setPackState({ distributionType: type });
  };

  return (
    <div className="quantities-step-wrapper">
      <p className="quantities-step-wrapper__title">
        Set number of cards in pack
      </p>
      <p className="quantities-step-wrapper__subtitle">
        Number of times user can redeem a card using a single voucher.
      </p>
      <Input
        className="quantities-step-wrapper__input"
        type="number"
        value={allowedAmountToRedeem}
        onChange={({ target: { value } }) => handleRedeemAmountChange(value)}
      />

      <p className="quantities-step-wrapper__title">Select distribution type</p>
      <div className="cards-select">
        {availableDistributionTypes.map(type => (
          <SelectCard
            key={type}
            title={DISTRIBUTION_TYPES_DATA[type].title}
            subtitle={DISTRIBUTION_TYPES_DATA[type].subtitle}
            isSelected={distributionType === type}
            onClick={() => handleDistributionTypeChange(type)}
          />
        ))}
      </div>

      <div className="quantities-step-wrapper__table-titles">
        {shouldRenderSupplyInput && <p>NUMBER OF NFTs</p>}
        {shouldRenderWeightInput && <p>REDEEM WEIGHT</p>}
      </div>

      {Object.values(selectedItems).map(item => (
        <ItemRow key={item.metadata.pubkey} item={item}>
          <>
            {shouldRenderSupplyInput && (
              <div className="input-column">
                <Input
                  type="number"
                  min={0}
                  max={item.masterEdition?.info.maxSupply?.toNumber()}
                  value={supplyByMetadataKey[item.metadata.pubkey]}
                  onChange={({ target: { value } }) =>
                    handleDistributionChange(item, value, InputType.maxSupply)
                  }
                />
              </div>
            )}
            {shouldRenderWeightInput && (
              <div className="input-column">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={weightByMetadataKey[item.metadata.pubkey]}
                  onChange={({ target: { value } }) =>
                    handleDistributionChange(item, value, InputType.weight)
                  }
                />
              </div>
            )}
          </>
        </ItemRow>
      ))}
    </div>
  );
};

export default memo(AdjustQuantitiesStep);
