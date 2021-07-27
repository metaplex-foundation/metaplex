import React, { useEffect, useState } from 'react';
import { Statistic } from 'antd';
import { useSolPrice } from '../../contexts';
import { formatUSD } from '@oyster/common';
import './index.less';

interface IAmountLabel {
  amount: number | string;
  displayUSD?: boolean;
  displaySOL?: boolean;
  title?: string;
  style?: object;
  containerStyle?: object;
  symbolStyle?: object;
}

export const AmountLabel = (props: IAmountLabel) => {
  const {
    amount: _amount,
    displayUSD = true,
    displaySOL = false,
    title = '',
    style = {},
    containerStyle = {},
    symbolStyle = {},
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
          value={`${amount}${displaySOL && ' SOL'}`}
          prefix={<img style={symbolStyle} src={'/sol-circle.svg'} />}
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
