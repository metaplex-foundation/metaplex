import React, { memo, ReactElement } from 'react';
import classNames from 'classnames';

import { ArtContent } from '../../../../components/ArtContent';
import { useExtendedArt } from '../../../../hooks';

import { ItemRowProps } from './interface';

const ItemRow = ({
  item,
  isSelected,
  onClick,
  showSupply,
  children,
}: ItemRowProps): ReactElement => {
  const { metadata, masterEdition } = item;
  const { pubkey } = metadata;
  const { name } = metadata?.info?.data;

  const { ref, data } = useExtendedArt(pubkey);

  const maximumSupply: string =
    masterEdition?.info.maxSupply?.toString() || 'Unlimited';
  const supply: string = masterEdition?.info.supply?.toString() || '0';

  const itemRowCls = classNames({
    'pack-item-row': true,
    'pack-item-row--selected': isSelected,
  });

  return (
    <div className={itemRowCls} onClick={onClick} ref={ref}>
      {children}
      <div className="preview-column">
        <ArtContent uri={data?.image} preview={false} />
      </div>
      <div className="name-column">
        <p className="name-column__name">{name}</p>
        <p className="name-column__subtitle">Master</p>
      </div>
      <div className="info-column">
        <p className="info-column__subtitle">Maximum Supply</p>
        <p className="info-column__value">{maximumSupply}</p>
      </div>
      {showSupply && (
        <div className="info-column">
          <p className="info-column__subtitle">Supply</p>
          <p className="info-column__value">{supply}</p>
        </div>
      )}
    </div>
  );
};

export default memo(ItemRow);
