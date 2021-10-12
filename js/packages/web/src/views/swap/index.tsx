import {notify, NumericInput, useConnection} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button, Select, Typography } from 'antd';
import React, { useCallback, useState } from 'react';
import { CurrencyInput } from '../../components/CurrencyInput/CurrencyInput';
import { useCurrencyPairState } from '../../contexts';
import { PoolOperation, usePoolForBasket } from '../../utils/pools';

export function Swap() {
  const { wallet, connect, connected } = useWallet();
  const { A, B, setLastTypedAccount, setPoolOperation } = useCurrencyPairState();

  const connection = useConnection();
  const pool = usePoolForBasket([A?.mintAddress, B?.mintAddress]);
  // const { slippage } = useSlippageConfig();
  const [pendingTx, setPendingTx] = useState(false);

  const handleSwapAccounts = useCallback(() => {
    const tempMint = A.mintAddress;
    const tempAmount = A.amount;
    A.setMint(B.mintAddress);
    A.setAmount(B.amount);
    B.setMint(tempMint);
    B.setAmount(tempAmount);
    // @ts-ignore
    setPoolOperation((op: PoolOperation) => {
      switch (+op) {
        case PoolOperation.SwapGivenInput:
          return PoolOperation.SwapGivenProceeds;
        case PoolOperation.SwapGivenProceeds:
          return PoolOperation.SwapGivenInput;
        case PoolOperation.Add:
          return PoolOperation.SwapGivenInput;
      }
    });
  }, []);

  const handleSwap = useCallback(async () => {
    if (A.account && B.mintAddress) {
      try {
        setPendingTx(true);

        const components = [
          {
            account: A.account,
            mintAddress: A.mintAddress,
            amount: A.convertAmount(),
          },
          {
            mintAddress: B.mintAddress,
            amount: B.convertAmount(),
          },
        ];

        await swap(connection, wallet, components, /*slippage, */ pool);
      } catch {
        notify({
          description:
            "Please try again and approve transactions from your wallet",
          message: "Swap trade cancelled.",
          type: "error",
        });
      } finally {
        setPendingTx(false);
      }
    }
  }, []);

  const { Option } = Select;

  const [fromSelect, setFromSelect] = useState('lstar');
  const [toSelect, setToSelect] = useState('usdc');
  const [fromInput, setFromInput] = useState();
  const [toInput, setToInput] = useState();

  const handleChange = (value) => {
    if(value === 'lstar') setToSelect('usdc');
    if(value === 'usdc') setToSelect('lstar');
    setFromSelect(value);
  }

  const handleToChange = (value) => {
    if(value === 'lstar') setFromSelect('usdc');
    if(value === 'usdc') setFromSelect('lstar');
    setToSelect(value);
  }

  const swapAccs = () => {
    let tempTo = toInput;
    setFromSelect(toSelect);
    setToSelect(fromSelect);
    setToInput(fromInput);
    setFromInput(tempTo);
  }

  return (
    <>
      <div style={{ background: '#141414', width: 600, margin: '50px auto', border: '1px solid #303030', padding: '25px', boxSizing: 'border-box', borderRadius: '10px' }}>
        <div className="input-card">
          {/*<AdressesPopover pool={pool} />*/}
          <CurrencyInput
            title="Input"
            onInputChange={(val: any) => {
              setPoolOperation(PoolOperation.SwapGivenInput);
              if (A.amount !== val) {
                setLastTypedAccount(A.mintAddress);
              }

              A.setAmount(val);
            }}
            amount={A.amount}
            mint={A.mintAddress}
            onMintChange={(item) => {
              A.setMint(item);
            }}
          />
          <Button type="primary" className="swap-button" style={{ margin: '10px 0' }} onClick={handleSwapAccounts}>
            ⇅
          </Button>
          <CurrencyInput
            title="To (Estimate)"
            onInputChange={(val: any) => {
              setPoolOperation(PoolOperation.SwapGivenProceeds);
              if (B.amount !== val) {
                setLastTypedAccount(B.mintAddress);
              }

              B.setAmount(val);
            }}
            amount={B.amount}
            mint={B.mintAddress}
            onMintChange={(item) => {
              B.setMint(item);
            }}
          />
        </div>
        <Button
          className="trade-button"
          type="primary"
          size="large"
          onClick={connected ? handleSwap : connect}
          style={{ width: '100%', marginTop: '10px' }}
        >
          Swap tokens
        </Button>
      </div>

      <div style={{ background: '#141414', width: 600, margin: '50px auto', border: '1px solid #303030', padding: '25px', boxSizing: 'border-box', borderRadius: '10px' }}>

        <div style={{ border: '1px solid #303030', padding: '25px', boxSizing: 'border-box', borderRadius: '20px'}}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
            <Typography.Text>Input</Typography.Text>
            <Typography.Text>Balance: 0</Typography.Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between'}}>
            <NumericInput value={fromInput} onChange={ (value) => { setFromInput(value) } } placeholder="0.00" style={{
                            fontSize: 20,
                            boxShadow: "none",
                            borderColor: "transparent",
                            outline: "transpaernt",
                            minWidth: '50%',
                            background: 'none',
                            padding: 0 }}
            />
            <Select value={fromSelect} onChange={ handleChange } style={{ width: '100%' }}>
              <Option value='lstar'>LSTAR</Option>
              <Option value='usdc'>USDC</Option>
            </Select>
          </div>
        </div>

        <p style={{ textAlign: 'center', margin: 0 }}>
          <Button type="primary" className="swap-button" style={{ margin: '10px 0' }} onClick={swapAccs}>
            ⇅
          </Button>
        </p>

        <div style={{ border: '1px solid #303030', padding: '25px', boxSizing: 'border-box', borderRadius: '20px'}}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
            <Typography.Text>To (Estimate)</Typography.Text>
            <Typography.Text>Balance: 0</Typography.Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between'}}>
            <NumericInput value={toInput} onChange={ (value) => { setToInput(value) } }  placeholder="0.00" style={{
              fontSize: 20,
              boxShadow: "none",
              borderColor: "transparent",
              outline: "transpaernt",
              minWidth: '50%',
              background: 'none',
              padding: 0 }}
            />
            <Select value={ toSelect } onChange={handleToChange} style={{ width: '100%' }}>
              <Option value='lstar'>LSTAR</Option>
              <Option value='usdc'>USDC</Option>
            </Select>
          </div>
        </div>

        <Button
          className="trade-button"
          type="primary"
          size="large"
          onClick={connected ? handleSwap : connect}
          style={{ width: '100%', marginTop: '15px' }}
        >
          Swap tokens
        </Button>
      </div>

      {/*<TradeInfo pool={pool} />*/}
    </>
  );
}
