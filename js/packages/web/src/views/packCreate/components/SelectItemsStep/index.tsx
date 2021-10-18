import React, { ReactElement } from 'react';

import ItemRow from '../ItemRow';

import { SelectItemsStepProps } from './interface';
import { isSelected } from './utils';

const SelectItemsStep = ({
  handleSelectItem,
  selectedItems,
  items,
  showSupply,
}: SelectItemsStepProps): ReactElement => {
  return (
    <div>
      {items.map(item => (
        <ItemRow
          key={item.metadata.pubkey}
          isSelected={isSelected({
            selectedItems,
            pubkey: item.metadata.pubkey,
          })}
          onClick={() => handleSelectItem(item)}
          item={item}
          showSupply={showSupply}
        />
      ))}
    </div>
  );
};

export default SelectItemsStep;
