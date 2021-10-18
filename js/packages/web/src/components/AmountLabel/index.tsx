import React, { useEffect, useState } from 'react';
import { Statistic } from 'antd';
import { useSolPrice } from '../../contexts';
import { formatUSD } from '@oyster/common';
import { SolCircle } from '../Custom';

interface IAmountLabel {
  amount: number | string;
  displayUSD?: boolean;
  displaySOL?: boolean;
  title?: string;
  iconSize?: number;
  customPrefix?: JSX.Element;
}

export const AmountLabel = (props: IAmountLabel) => {
  const {
    amount: _amount,
    displayUSD = true,
    displaySOL = false,
    title = '',
    iconSize = 38,
    customPrefix,
  } = props;
  const amount = typeof _amount === 'string' ? parseFloat(_amount) : _amount;

  const solPrice = useSolPrice();

  const [priceUSD, setPriceUSD] = useState<number | undefined>(undefined);

  useEffect(() => {
    setPriceUSD(solPrice * amount);
  }, [amount, solPrice]);

  const PriceNaN = isNaN(amount);

  return (
    <div>
      {PriceNaN === false && (
        <Statistic
          title={title || ''}
          value={`${amount}${displaySOL ? ' SOL' : ''}`}
          prefix={customPrefix || <SolCircle iconSize={iconSize} />}
        />
      )}
      {displayUSD && (
        <div>
          {PriceNaN === false ? formatUSD.format(priceUSD || 0) : 'Place Bid'}
        </div>
      )}
    </div>
  );
};
