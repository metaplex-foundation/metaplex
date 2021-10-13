import { notify, useConnection } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createTokenATransaction, createTokenBTransaction, getAmountOut, getUserTokenABalance, getUserTokenBBalance, initTokenAccounts, initTokenSwap, isUserTokenAAccount, isUserTokenBAccount, setAmountIn, setIsReverse, swap, updateUserTokenAccounts } from '../../actions/swap.actions';
import { InputAmount } from '../../components/InputAmount/InputAmount';
import { SwapSymbolTypes } from '../../models/Swap.model';
import styles from './Swap.module.less';
import { StarOutlined } from '@ant-design/icons';

const IconsMap = {
  usdt: <img src="/symbols/usdc.png" />,
  lstar: <StarOutlined />,
};

export function Swap() {
  const connection = useConnection();
  const wallet = useWallet();

  const [ fromAmount, setFromAmount ] = useState(0);
  const [ toAmount, setToAmount ] = useState(0);
  const [ isReserseState, setIsReverseState ] = useState(false);
  const [ isInited, setIsInited ] = useState(false);
  const [ isTokenCreated, setIsTokenCreated ] = useState(false);
  // lstar
  const [ balanceA, setBalanceA ] = useState(0);
  // usdc
  const [ balanceB, setBalanceB ] = useState(0);

  const currentBalance = useMemo(() => isReserseState ? balanceA : balanceB, [isReserseState, balanceA, balanceB]);

  const handleCreateToken = useCallback(async () => {
    if (!isUserTokenAAccount()) {
      await createTokenATransaction();
    }
    if (!isUserTokenBAccount()) {
      await createTokenBTransaction();
    }
    setIsTokenCreated(true);

    notify({
      message: 'Token account created.',
      type: 'success',
    });
  }, []);

  const handleSwap = useCallback(async () => {
    if (!isTokenCreated) {
      return handleCreateToken();
    }

    try {
      const result = await swap();
      if (result) {
        notify({
          message: 'Swap completed.',
          type: 'success',
        });
      }
    } catch {
      notify({
        description:
          'Please try again and approve transactions from your wallet',
        message: 'Swap trade cancelled.',
        type: 'error',
      });
    }
  }, []);

  const updateBalances = useCallback(async () => {
    await updateUserTokenAccounts();
    setBalanceA(getUserTokenABalance());
    setBalanceB(getUserTokenBBalance());
  }, []);

  const handleFromChange = useCallback((value) => {
    setFromAmount(value);
    setAmountIn(value);
    setToAmount(getAmountOut());
  }, []);

  const handleReverse = useCallback(() => {
    const tempTo = toAmount;
    setToAmount(fromAmount);
    setFromAmount(tempTo);
    setIsReverse();
    setIsReverseState((prev) => !prev);
  }, [ toAmount, fromAmount ]);

  useEffect(() => {
    if (!connection || !wallet.publicKey) {
      return;
    }

    const init = async () => {
      await initTokenSwap(connection, wallet);
      await initTokenAccounts();
      await updateBalances();
      setIsInited(true);
      if (isUserTokenAAccount() && isUserTokenBAccount()) {
        setIsTokenCreated(true);
      }
    };

    init();
  }, [ connection, wallet ]);

  return (
    <div className={styles.root}>
      <div>inited: {JSON.stringify(isInited)}</div>
      <InputAmount
        value={fromAmount}
        onChange={handleFromChange}
        balance={!isReserseState ? balanceA : balanceB}
        symbol={!isReserseState ? SwapSymbolTypes.Lstar : SwapSymbolTypes.USDC}
        icon={!isReserseState ? IconsMap.lstar : IconsMap.usdt}
        label="Input"
      />

      <div className={styles.swapBox}>
        <Button
          type="primary"
          className={styles.swapButton}
          onClick={handleReverse}
        >
          ⇅
        </Button>
      </div>

      <InputAmount
        value={toAmount}
        balance={isReserseState ? balanceA : balanceB}
        symbol={isReserseState ? SwapSymbolTypes.Lstar : SwapSymbolTypes.USDC}
        icon={isReserseState ? IconsMap.lstar : IconsMap.usdt}
        label="To (Estimate)"
        disabled
      />

      <Button
        className={styles.submitButton}
        type="primary"
        size="large"
        onClick={wallet.connected ? handleSwap : wallet.connect}
        disabled={!isInited || !wallet.connected || toAmount > currentBalance}
      >
        {isTokenCreated ? 'Swap tokens' : 'Create token account'}
      </Button>
    </div>
  );
}
