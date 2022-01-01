import { formatUSD } from '@oyster/common';
import { Statistic } from 'antd';
import React, { useEffect, useState } from 'react';
import { useSolPrice } from '../../contexts';
import { SolCircle } from '../Custom';
import styled from 'styled-components';

interface IAmountLabel {
  amount: number;
  displayUSD?: boolean;
  displaySOL?: boolean;
  title?: string;
  customPrefix?: JSX.Element;
}

export const AmountLabel = (props: IAmountLabel) => {
  const { amount, displayUSD = true, title = '', customPrefix } = props;

  const solPrice = useSolPrice();

  const [priceUSD, setPriceUSD] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (solPrice !== undefined) setPriceUSD(solPrice * amount);
  }, [amount, solPrice]);

  const PriceNaN = isNaN(amount);

  const StyledOuterWrapper = styled.div`
    display: flex;
    flex-direction: column;
  `;

  return (
    <StyledOuterWrapper>
      <div className="amount-label-wrapper">
        {PriceNaN === false && (
          <Statistic
            className="sol-price"
            value={amount.toLocaleString()}
            prefix={customPrefix || <SolCircle />}
          />
        )}
        {displayUSD && <span className="metaplex-opacity-5">|</span>}
        {displayUSD && (
          <div>
            {PriceNaN === false ? formatUSD.format(priceUSD || 0) : 'Place Bid'}
          </div>
        )}
      </div>
      <p className="auction-status">{title}</p>
    </StyledOuterWrapper>
  );
};
