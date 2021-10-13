import { notify } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from 'antd';
import React, { useCallback, useState } from 'react';
import { swap } from '../../actions/swap.actions';
import { InputAmount } from '../../components/InputAmount/InputAmount';
import { useTokenSwap } from '../../hooks/useTokenSwap';
import { SwapSymbolTypes } from '../../models/Swap.model';
import styles from './Swap.module.less';

export function Swap() {
  const { connect, connected } = useWallet();
  useTokenSwap();

  const [ pendingTx, setPendingTx ] = useState(false);
  const [ fromSelect, setFromSelect ] = useState('lstar');
  const [ toSelect, setToSelect ] = useState('usdc');
  const [ fromInput, setFromInput ] = useState(0);
  const [ toInput, setToInput ] = useState(0);

  const handleSwap = useCallback(async () => {
    try {
      await swap();
    } catch {
      notify({
        description:
          'Please try again and approve transactions from your wallet',
        message: 'Swap trade cancelled.',
        type: 'error',
      });
    } finally {
      setPendingTx(false);
    }
  }, []);

  const handleFromChange = useCallback((value) => {
    setFromInput(value);
  }, []);

  const handleToChange = useCallback((value) => {
    setToInput(value);
  }, []);

  const handleSwapAccounts = useCallback(() => {
    const tempTo = toInput;
    setFromSelect(toSelect);
    setToSelect(fromSelect);
    setToInput(fromInput);
    setFromInput(tempTo);
  }, [ toInput, toSelect, fromSelect, fromInput ]);

  return (
    <div className={styles.root}>
      <InputAmount
        value={fromInput}
        onChange={handleFromChange}
        balance={100}
        symbol={SwapSymbolTypes.Lstar}
        label="Input"
      />

      <div className={styles.swapBox}>
        <Button
          type="primary"
          className={styles.swapButton}
          onClick={handleSwapAccounts}
        >
          ⇅
        </Button>
      </div>

      <InputAmount
        value={toInput}
        onChange={handleToChange}
        balance={200}
        symbol={SwapSymbolTypes.USDC}
        label="To (Estimate)"
        disabled
      />

      <Button
        className={styles.submitButton}
        type="primary"
        size="large"
        onClick={connected ? handleSwap : connect}
      >
        Swap tokens
      </Button>
    </div>
  );
}
