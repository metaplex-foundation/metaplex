import { NumericInput } from '@oyster/common';
import { Typography } from 'antd';
import React from 'react';
import styles from './InputAmount.module.less';

export function InputAmount({ value, label, balance, symbol, disabled, onChange }: {
  value: number;
  balance: number;
  label: string;
  symbol: string;
  disabled: boolean;
  onChange: (value: number) => void;
}) {


  return (
    <div className={styles.root}>
      <div className={styles.labelBox}>
        <Typography.Text>{label}</Typography.Text>
        <Typography.Text>Balance: {balance}</Typography.Text>
      </div>
      <div className={styles.wrapperBox}>
        <div className={styles.inputBox}>
          <NumericInput
            value={value}
            onChange={onChange}
            placeholder="0.00"
            disabled={disabled}
          />
        </div>
        <div className={styles.symbolBox}>
          <div className={styles.icon}>icon</div>
          <div className={styles.symbol}>{symbol}</div>
        </div>
      </div>
    </div>
  )
}
