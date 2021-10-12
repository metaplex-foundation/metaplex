import { notify, useConnection } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from 'antd';
import React, { useCallback, useState } from 'react';
import { swap } from '../../actions/swap';
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

  return (
    <>
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
        <Button type="primary" className="swap-button" onClick={handleSwapAccounts}>
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
        style={{ width: '100%' }}
      >
        Swap tokens
      </Button>
      {/*<TradeInfo pool={pool} />*/}
    </>
  );
}
