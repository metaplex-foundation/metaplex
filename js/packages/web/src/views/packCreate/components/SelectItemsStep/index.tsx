import React, { ReactElement } from 'react';

import ItemRow from '../ItemRow';

import { SelectItemsStepProps } from './interface';
import { isSelected } from './utils';

const SelectItemsStep = ({
  handleSelectItem,
  selectedItems,
  items,
  showSupply,
  emptyMessage,
}: SelectItemsStepProps): ReactElement => {
  const shouldShowEmptyMessage = !items?.length && emptyMessage;

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
      {shouldShowEmptyMessage && <p>{emptyMessage}</p>}
    </div>
  );
};

export default SelectItemsStep;
