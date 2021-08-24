import React, { useEffect, useState } from 'react';
import { Button, Progress, Typography } from 'antd';
import { web3, Provider, Program, Wallet, Idl } from '@project-serum/anchor';
import type { BN } from '@project-serum/anchor';
import { useConnection, useWallet } from '@oyster/common';
import idl from '../../config/simple_token_sale.json';
import type { MasterAccount } from './types';
import { Confetti } from './../../components/Confetti';
import { PublicKey } from '@solana/web3.js';
import { FeatureList } from './FeatureList';

const TOKEN_SALE_PROGRAM_ADDRESS =
  'Bpr78AJoh1Mq69iM67sHvPKaa36AzZYeGfLGLiwAzjnk';
const TOKEN_SALE_MASTER_ACCOUNT_ADDRESS =
  'ZyqQKfAiZuXyisA9bXbKmNxyRYAe5a75FBc5JsnPdys';

const MAX_RETRIES = 5;  // what is a good value for this?

const { Title } = Typography;

const getPurchaseBtnText = (
  connected: boolean,
  isProcessing: boolean,
  isDone: boolean,
  price: number,
  isSoldOut: boolean,
  errorPurchasing: Error | null,
) => {
  if (!connected) return 'connect your wallet';
  else if (errorPurchasing !== null) return 'Something goes wrong...';
  else if (isSoldOut)
    return <span className="bungee-font-inline">COLECTION SOLD OUT</span>;
  else if (isProcessing) return 'processing request...';
  else if (isDone)
    return (
      <span>
        Success! 🎉 Your <span className="bungee-font-inline">bird</span> is on
        its way...
      </span>
    );
  else
    return (
      <span>
        Mint <span className="bungee-font-inline">bird</span> for ◎{price} SOL!
      </span>
    );
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
  try {
    const masterAccount = await program.account.masterAccount.fetch(accountId);
    if (masterAccount) {
      const account = masterAccount as MasterAccount;
      console.log(
        'Fetched master account: ',
        TOKEN_SALE_MASTER_ACCOUNT_ADDRESS,
      );
      setAccountFn(masterAccount as MasterAccount);
      if (account && account.numTokens.toNumber() > 0) {
        // set progress value and amount remaining
        if (account.counter.toNumber() <= 1) {
          setProgressValueFn(0);
          setAmountRemainingFn(account.numTokens.toNumber());
        } else {
          setProgressValueFn(
            Math.round(
              (account.counter.toNumber() / account.numTokens.toNumber()) * 100,
            ),
          );
          setAmountRemainingFn(
            account.numTokens.toNumber() - account.counter.toNumber(),
          );
        }
        // set price
        if (account.counter.toNumber() >= 2222) {
          setCurrentPriceFn(3);
        } else if (account.counter.toNumber() >= 1111) {
          setCurrentPriceFn(2);
        }
      }
    }
  } catch (error) {
    console.warn(`Can't get the account: ${error.message}`);
  }
};

export const PurchaseArt = () => {
  const { wallet, connected } = useWallet();
  const connection = useConnection();

  const [account, setAccount] = useState<MasterAccount | undefined>(undefined);
  const [progressValue, setProgressValue] = useState<number | null>(null);
  const [amountRemaining, setAmountRemaining] = useState<number>(3333); // TODO: whats a good default?
  const [currentPrice, setCurrentPrice] = useState<number>(1);
  const [retriedTimes, setRetriedTimes] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [ifDealMade, setDealMade] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorPurchasing, setErrorPurchasing] = useState(null);

  const [anchorProvider, setAnchorProvider] = useState<Provider | null>(null);
  const [anchorProgram, setAnchorProgram] = useState<Program | null>(null);

  const masterAccountPubkey = new web3.PublicKey(
    TOKEN_SALE_MASTER_ACCOUNT_ADDRESS,
  );
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
      );
    } else {
      console.log('Token sale info not found');
    }
  };

  useEffect(() => {
    const provider = new Provider(
      connection,
      wallet as any,
      Provider.defaultOptions(),
    );
    const tokenSaleProgram = new Program(
      idl as Idl,
      tokenSaleProgramId,
      provider,
    );
    setAnchorProvider(provider);
    setAnchorProgram(tokenSaleProgram);
  }, [wallet]);

  useEffect(() => {
    const runner = async () => {
      if (wallet?.publicKey) {
        await refreshInformation();
      } else {
      }
    };
    runner();
  }, [wallet, connected]);

  const doPurchase = async () => {
    if (
      !connected ||
      !wallet?.publicKey ||
      !account ||
      !anchorProgram ||
      !anchorProvider
    ) {
      throw new Error('Something bad happened.');
    }

    try {
      setIsProcessing(true);

      const payer = wallet.publicKey.toBase58();

      const receipt = web3.Keypair.generate();
      const receiptSize = 8 + 32 + 32 + 8 + 8;

      const txId = await anchorProgram.rpc.purchase({
        accounts: {
          payer,
          receipt: receipt.publicKey,
          authority: account.authority,
          masterAccount: masterAccountPubkey,
          systemProgram: web3.SystemProgram.programId,
        },
        signers: [receipt],
        instructions: [
          web3.SystemProgram.createAccount({
            fromPubkey: wallet.publicKey,
            newAccountPubkey: receipt.publicKey,
            space: receiptSize, // Add 8 for the account discriminator.
            lamports: await anchorProvider.connection.getMinimumBalanceForRentExemption(receiptSize),
            programId: anchorProgram.programId,
          }),
        ],
      });

      console.log('Successful purchase, transaction ID: ', txId);

      setDealMade(true);
      refreshInformation();
    } catch (error) {

      if (retriedTimes > MAX_RETRIES) {
        // this is so that we can break out of a potentially endless loop of retrying
        console.warn('Error occurred while purchasing the item: ', error);
        setErrorPurchasing(error);
      } else {
        setRetriedTimes(retriedTimes + 1);
        console.log(`Retry #retriedTimes`);
        refreshInformation().then(async () => {
          await doPurchase();
        });
      }

    } finally {
      if (retriedTimes > MAX_RETRIES) {
        setIsProcessing(false);
        setIsDone(true);
      }
    }
  };

  if (isLoading) return <div>loading...</div>;

  const isSoldOut = progressValue !== null && progressValue >= 100;

  const btnText = getPurchaseBtnText(
    connected,
    isProcessing,
    isDone,
    currentPrice,
    isSoldOut,
    errorPurchasing,
  );

  return (
    <div className="purchase-screen bungee-font">
      <Title level={2} className="welcome-text">
        Introducing Thugbirdz: OG Collection
      </Title>
      <img src="hero.gif" />
      {ifDealMade ? <Confetti /> : null}

      {!account ? (
        <h1 className="highlight sold-out">CONNECT YOUR WALLET</h1>
      ) : null}

      {isSoldOut ? <h1 className="highlight sold-out">SOLD OUT</h1> : null}

      {progressValue !== null && !isSoldOut && account && (
        <>
          <Button
            type="primary"
            shape="round"
            size="large"
            className="app-btn purchase-btn"
            onClick={doPurchase}
            disabled={
              !connected ||
              isDone ||
              ifDealMade ||
              isProcessing ||
              !!errorPurchasing
            }
          >
            {btnText}
          </Button>

          {errorPurchasing ? (
            <div className="purchase-error">
              <b>Error occurred while purchasing the item.</b>
              <br />
              Make sure you have enough SOL in your wallet and you use correct Solana
              network (mainnet-beta).
              <br />
              Then refresh the page and try again!
            </div>
          ) : null}

          <div className="only-left-text">
            Only <span className="highlight">{amountRemaining}</span> of{' '}
            <span className="highlight">{account.numTokens.toNumber()}</span>{' '}
            remaining
          </div>
          <Progress percent={progressValue} />
        </>
      )}
      <br></br>
      <br></br>
      <br></br>
      {/* <FeatureList /> */}
    </div>
  );
};
