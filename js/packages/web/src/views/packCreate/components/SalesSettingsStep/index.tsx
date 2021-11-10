import React, { memo, ReactElement } from 'react';

import SelectCard from '../SelectCard';

import { SalesSettingsStepProps } from './interface';

const SalesSettingsStep = ({
  setPackState,
  redeemEndDate,
}: SalesSettingsStepProps): ReactElement => {
  const isExpirationSet = !!redeemEndDate;

  return (
    <div className="sales-step-wrapper">
      <p className="sales-step-wrapper__title">Pack expiration</p>
      <p className="sales-step-wrapper__subtitle">
        Without an expiration date masters will remain locked until all packs
        are opened.
      </p>

      <div className="cards-select">
        <SelectCard
          title="No expiration"
          subtitle="Masters will remain locked"
          isSelected={!isExpirationSet}
          onClick={() => setPackState({ redeemEndDate: null })}
        />
      </div>
    </div>
  );
};

export default memo(SalesSettingsStep);
