import React from 'react';
import { useMint } from '../../contexts/accounts';
import { useAccountByMint } from '../../hooks';
import { TokenIcon } from '../TokenIcon';

export const TokenDisplay = (props: {
  name: string;
  mintAddress: string;
  icon?: JSX.Element;
  showBalance?: boolean;
}) => {
  const { showBalance, mintAddress, name, icon } = props;
  const tokenMint = useMint(mintAddress);
  const tokenAccount = useAccountByMint(mintAddress);

  let balance: number = 0;
  let hasBalance: boolean = false;
  if (showBalance) {
    if (tokenAccount && tokenMint) {
      balance =
        tokenAccount.info.amount.toNumber() / Math.pow(10, tokenMint.decimals);
      hasBalance = balance > 0;
    }
  }

  return (
    <>
      <div title={mintAddress} key={mintAddress}>
        <div>
          {icon || <TokenIcon mintAddress={mintAddress} />}
          {name}
        </div>
        {showBalance ? (
          <span title={balance.toString()} key={mintAddress}>
            &nbsp;{' '}
            {hasBalance
              ? balance < 0.001
                ? '<0.001'
                : balance.toFixed(3)
              : '-'}
          </span>
        ) : null}
      </div>
    </>
  );
};
