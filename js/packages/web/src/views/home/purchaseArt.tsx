import React, { useEffect, useMemo, useState } from 'react';
import { Button, Progress, Typography } from 'antd';
import { web3, Provider, Program } from '@project-serum/anchor';
import type { BN } from '@project-serum/anchor';
import { useConnection, useWallet } from '@oyster/common';
import idl from '../../config/simple_token_sale.json';
import type { MasterAccount, Receipt } from './types';
import { Confetti } from './../../components/Confetti';
import { PublicKey } from '@solana/web3.js';

const TOKEN_SALE_PROGRAM_ADDRESS = '4vo3wuNkVB3UEpYSGjTXNFejEaVr5q7W2KGmg2U5nDrM';
const TOKEN_SALE_MASTER_ACCOUNT_ADDRESS = '2vxBAJ6niNbXWyofnT4W1mbiyyw94QeWsZZuD7nGgvvd';

const { Title } = Typography;

const getPurchaseBtnText = (
  connected: boolean,
  isProcessing: boolean,
  isDone: boolean,
  price: number,
) => {
  if (!connected) return 'connect your wallet';
  else if (isProcessing) return 'processing request...';
  else if (isDone) return 'your bird is on its way...';
  else return `Mint bird for ◎${price} SOL!`;
};

/** Convenience function to refresh token sale data */
const updateTokenSane = async (
  accountId: PublicKey,
  program: Program,
  setAccountFn: React.Dispatch<React.SetStateAction<MasterAccount | undefined>>,
  setProgressValueFn: React.Dispatch<React.SetStateAction<number | null>>,
  setAmountRemainingFn: React.Dispatch<React.SetStateAction<number>>,
  setCurrentPriceFn: React.Dispatch<React.SetStateAction<number>>,
) => {
  const masterAccount = await program.account.masterAccount.fetch(accountId);
  if (masterAccount) {
    const account = masterAccount as MasterAccount;
    console.log('Fetched master account: ', TOKEN_SALE_MASTER_ACCOUNT_ADDRESS);
    setAccountFn(masterAccount as MasterAccount);
    if (account && account.numTokens.toNumber() > 0) {
      // set progress value and amount remaining
      if (account.counter.toNumber() <= 1) {
        setProgressValueFn(0);
        setAmountRemainingFn(account.numTokens.toNumber());
      } else {
        setProgressValueFn(Math.round((account.counter.toNumber() / account.numTokens.toNumber()) * 100));
        setAmountRemainingFn(account.numTokens.toNumber() - account.counter.toNumber());
      }
      // set price
      if (account.counter.toNumber() >= 2222) {
        setCurrentPriceFn(3);
      } else if (account.counter.toNumber() >= 1111) {
        setCurrentPriceFn(2);
      }
    }
  }
}


export const PurchaseArt = () => {
  const { wallet, connected } = useWallet();
  const connection = useConnection();

  const [account, setAccount] = useState<MasterAccount | undefined>(undefined);
  const [progressValue, setProgressValue] = useState<number | null>(null);
  const [amountRemaining, setAmountRemaining] = useState<number>(3333); // TODO: whats a good default?
  const [currentPrice, setCurrentPrice] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [ifDealMade, setDealMade] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const [anchorProvider, setAnchorProvider] = useState<Provider | null>(null);
  const [anchorProgram, setAnchorProgram] = useState<Program | null>(null);

  const masterAccountPubkey = new web3.PublicKey(TOKEN_SALE_MASTER_ACCOUNT_ADDRESS);
  const tokenSaleProgramId = new web3.PublicKey(TOKEN_SALE_PROGRAM_ADDRESS);

  const refreshInformation = async () => {
    if (anchorProgram) {
      await updateTokenSane(
        masterAccountPubkey,
        anchorProgram,
        setAccount,
        setProgressValue,
        setAmountRemaining,
        setCurrentPrice,
      )
    } else {
      console.log('Token sale info not found');
    }
  }

  useEffect(() => {
      const provider = new Provider(connection, wallet, Provider.defaultOptions());
      const tokenSaleProgram = new Program(idl, tokenSaleProgramId, provider);
      setAnchorProvider(provider);
      setAnchorProgram(tokenSaleProgram);
  }, [wallet]);

  useEffect(() => {
    const runner = async () => {
      if (wallet?.publicKey) {
        await refreshInformation();
      } else {
      }
    }
    runner();
  }, [wallet, connected]);

  const doPurchase = async () => {
    if (!connected || !wallet?.publicKey || !account || !anchorProgram || !anchorProvider) {
      throw new Error('Something bad happened.');
    }

    try {
      setIsProcessing(true);

      const payer = wallet.publicKey.toBase58();
      const [pda, bump] = await web3.PublicKey.findProgramAddress(
        [masterAccountPubkey.toBuffer(), Buffer.from(`${account.counter.toNumber()}`)],
        anchorProgram.programId,
      );

      const txId = await anchorProgram.rpc.purchase(account.counter, bump, {
        accounts: {
          payer,
          receipt: pda,
          authority: account.authority,
          masterAccount: masterAccountPubkey,
          systemProgram: web3.SystemProgram.programId,
        },
      });

      console.log('Successful purchase, transaction ID: ', txId);

      setDealMade(true);
      refreshInformation();
    } catch (error) {
      console.warn('Error occurred while purchasing the item: ', error);
    } finally {
      setIsProcessing(false);
      setIsDone(true);
    }
  };

  if (isLoading) return <div>loading...</div>;

  const btnText = getPurchaseBtnText(connected, isProcessing, isDone, currentPrice);

  return (
    <div className="purchase-screen bungee-font">
      <Title level={2} className="welcome-text">Introducing Thugbirdz: OG Collection</Title>
      <img src = 'hero.gif'/>
      {ifDealMade ? <Confetti /> : null}

      {progressValue === 100 ? (
        <h1 className="highlight sold-out">SOLD OUT</h1>
      ) : null}

       {progressValue !== null && progressValue < 100 && account && (
        <>
          <Button
            type="primary"
            shape="round"
            size="large"
            className="app-btn purchase-btn"
            onClick={doPurchase}
            disabled={!connected || ifDealMade}
          >
            {btnText}
          </Button>
          <div className="only-left-text">
            Only{' '}
            <span className="highlight">
              {amountRemaining}
            </span>{' '}
            of <span className="highlight">{account.numTokens.toNumber()}</span> remaining
          </div>
          <Progress percent={progressValue} />
        </>
      )} 
    <br></br>
    <br></br>
    <br></br>
    <Title level={3} className="welcome-text">Possible features</Title>
  </div>
  );
};
