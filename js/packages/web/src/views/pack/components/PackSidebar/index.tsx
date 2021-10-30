import { ParsedAccount } from '@oyster/common';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';
import React from 'react';
import { Skeleton } from 'antd';

const PackSidebar = ({ pack }: { pack?: ParsedAccount<PackSet> }) => (
  <div className="pack-view__sidebar">
    <h4>{pack?.info?.name || <Skeleton paragraph={{ rows: 0 }} />}</h4>
    <div className="pack-view__info">
      <div className="info-item">
        <p>PACK OF</p>
        <p className="info-count">
          {pack?.info?.allowedAmountToRedeem || 0} NFTs
        </p>
      </div>
    </div>
    <div className="pack-view__description-block">
      <p className="pack-view__title">DETAILS</p>
      <p className="pack-view__text">
        {pack?.info?.description || <Skeleton paragraph={{ rows: 3 }} />}
      </p>
    </div>

    <div className="pack-view__summary">
      <div className="price">
        <p className="pack-view__title">PACK OPENING UNLOCKS</p>
        <div className="price__info">
          <p className="info-sol">Nov 9, 2021</p>
        </div>
      </div>
    </div>
  </div>
);

export default PackSidebar;
