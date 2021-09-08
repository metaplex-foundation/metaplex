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
  style?: object;
  containerStyle?: object;
  iconSize?: number;
  customPrefix?: JSX.Element;
}

export const AmountLabel = (props: IAmountLabel) => {
  const {
    amount: _amount,
    displayUSD = true,
    displaySOL = false,
    title = '',
    style = {},
    containerStyle = {},
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
    <div style={{ display: 'flex', ...containerStyle }}>
      {PriceNaN === false && (
        <Statistic
          style={style}
          className="create-statistic"
          title={title || ''}
          value={`${amount}${displaySOL ? ' SOL' : ''}`}
          prefix={customPrefix || <SolCircle iconSize={iconSize} />}
        />
      )}
      {displayUSD && (
        <div className="usd">
          {PriceNaN === false ? (
            formatUSD.format(priceUSD || 0)
          ) : (
            <div className="placebid">Place Bid</div>
          )}
        </div>
      )}
    </div>
  );
};
