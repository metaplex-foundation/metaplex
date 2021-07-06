import React, { useEffect, useState } from 'react';
import { Statistic } from 'antd';
import { useSolPrice } from '../../contexts';
import { formatUSD } from '@oyster/common';

interface IAmountLabel {
  amount: number | string;
  displayUSD?: boolean;
  title?: string;
  style?: object;
  containerStyle?: object;
}

export const AmountLabel = (props: IAmountLabel) => {
  const {
    amount: _amount,
    displayUSD = true,
    title = '',
    style = {},
    containerStyle = {},
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
          value={amount}
          prefix="◎"
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
