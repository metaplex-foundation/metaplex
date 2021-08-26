import React, { useEffect, useState } from 'react';
import { Button, Progress, Typography, Row, Col } from 'antd';
import { web3, Provider, Program, Wallet, Idl } from '@project-serum/anchor';
import type { BN } from '@project-serum/anchor';
import { useConnection, useWallet, ConnectButton } from '@oyster/common';
import idl from '../../config/simple_token_sale.json';
import type { MasterAccount } from './types';
import { Confetti } from './../../components/Confetti';
import { PublicKey } from '@solana/web3.js';
import { FeatureList } from './FeatureList';

const TOKEN_SALE_PROGRAM_ADDRESS =
  '4vo3wuNkVB3UEpYSGjTXNFejEaVr5q7W2KGmg2U5nDrM';
const TOKEN_SALE_MASTER_ACCOUNT_ADDRESS =
  'EwaL61ayrw2F7f3AdG83LqU7jPiMmytuR6jA7hJpwpsK';

const MAX_RETRIES = 5; // what is a good value for this?

const isSaleStarted = false;

const { Title } = Typography;

const getPurchaseBtnText = (
  connected: boolean,
  isProcessing: boolean,
  isDone: boolean,
  price: number,
  isSoldOut: boolean,
  errorPurchasing: Error | null,
  retriedTimes: number,
) => {
  if (!connected) return 'connect your wallet';
  else if (errorPurchasing !== null) return 'No Success 😔 Try Again';
  else if (isSoldOut)
    return <span className="bungee-font-inline">COLECTION SOLD OUT</span>;
  else if (isProcessing && retriedTimes > 0 && !isDone)
    return `Trying again  (${retriedTimes} try)...`;
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

  const doPurchase = async (retriedCounter: number) => {
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

      // throw new Error('failed');
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
            lamports:
              await anchorProvider.connection.getMinimumBalanceForRentExemption(
                receiptSize,
              ),
            programId: anchorProgram.programId,
          }),
        ],
      });

      console.log('Successful purchase, transaction ID: ', txId);

      setIsProcessing(false);
      setDealMade(true);
      refreshInformation();
      setIsDone(true);
    } catch (error) {
      if (retriedCounter > MAX_RETRIES) {
        // this is so that we can break out of a potentially endless loop of retrying
        console.warn('Error occurred while purchasing the item: ', error);
        setErrorPurchasing(error);
      } else {
        // prevent multiply purchases for single buy button
        if (isDone) return;

        const retriedTimesUpdated = retriedCounter + 1;
        setRetriedTimes(retriedTimesUpdated);
        console.log(`Retry #retriedTimes`);
        refreshInformation().then(async () => {
          await doPurchase(retriedTimesUpdated);
        });
      }
    } finally {
      if (isDone || retriedCounter > MAX_RETRIES) {
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
    retriedTimes,
  );

  if (!isSaleStarted) return <ComingSoon />;

  return (
    <div className="purchase-screen bungee-font">
      <Title level={2} className="welcome-text">
        Introducing Thugbirdz: OG Collection
        {/* We have experienced significant traffic overload over sale. */}
      </Title>

      <img src="hero.gif" />

      {!account ? (
        <>
          <h1 className="highlight sky-title">CONNECT YOUR WALLET</h1>
          <ConnectButton
            type="primary"
            style={{ fontSize: '24px', height: 'auto' }}
          />
        </>
      ) : null}
      {isSoldOut ? <h1 className="highlight sky-title">SOLD OUT</h1> : null}
      {progressValue !== null && !isSoldOut && account && (
        <>
          <Button
            type="primary"
            shape="round"
            size="large"
            className="app-btn purchase-btn"
            onClick={() => doPurchase(retriedTimes)}
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
              <b>Information. TX wasn't successful.</b>
              <br />
              Make sure you have enough SOL in your wallet and you use correct
              Solana network (mainnet-beta).
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
      {ifDealMade ? <Confetti /> : null}
      <br></br>
      <br></br>
      <br></br>
      <FeatureList />
    </div>
  );
};

const styles = {
  error: {
    fontSize: '2.5em',
    marginTop: '-350px',
    position: 'relative',
    zIndex: 1,
    maxWidth: '680px',
    textAlign: 'center',
  },
  description: {
    color: 'white',
    fontSize: '1.5em',
    margin: 0,
  },
  soonBuy: {
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    flexDirection: 'column',
  },
  social: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100px',
  },
  socialText: {
    margin: 0,
    fontSize: '2em',
  },
};

const ComingSoon = () => (
  <div className="purchase-screen bungee-font">
    <br />
    <br />
    <br />
    <Title level={2} className="welcome-text">
      Introducing Thugbirdz: OG Collection
    </Title>
    <br />
    <br />

    <Row gutter={[0, 24]}>
      <Col span={12}>
        <img src="hero.gif" style={{ height: '250px' }} />
        <Button
          type="primary"
          shape="round"
          size="large"
          className="app-btn purchase-btn"
          onClick={() => {}}
          disabled={true}
        >
          coming soon
        </Button>
      </Col>
      <Col span={12} style={{ display: 'flex', alignItems: 'flex-end' }}>
        <div>
          <div className="only-left-text">
            <span className="highlight">{2580}</span> of{' '}
            <span className="highlight">{3333}</span> remaining
          </div>
          <Progress percent={22} />
          <br />
          <br />
          <br />
          <p style={styles.description}>
            Collection of <b>3,333</b> uniquely generated, tough and collectible
            thugbirdz.
          </p>
        </div>
      </Col>
    </Row>

    <br />
    <br />
    <br />
    <br />
  
    <Row gutter={[0, 24]}>
      <Col span={12}>
        <a
          style={styles.social}
          href="https://discord.com/invite/thugbirdz"
          target="_blank"
        >
          <DiscordLogo />
        </a>
      </Col>
      <Col span={12}>
        <a
          style={styles.social}
          href="https://twitter.com/thugbirdz"
          target="_blank"
        >
          <TwitterLogo />
        </a>
      </Col>
    </Row>

    {/* <h1 className="highlight sky-title">
      So, we have paused it and updating our infra so no server overloads,
      weather cyclons or any other gang clans {"can't"} stop our birdz on its
      way to you!
    </h1> */}

    <br />
    <br />
    <br />
    <br />

    <FeatureList />
  </div>
);

const DeadServer = () => (
  <div className="purchase-screen bungee-font">
    <Title level={2} className="welcome-text">
      {/* Introducing Thugbirdz: OG Collection */}
      We have experienced significant traffic overload over sale.
    </Title>
    <img src="hero.gif" style={{ filter: 'blur(30px)' }} />

    <h1 className="highlight sky-title" style={styles.error as any}>
      So, we have paused it and updating our infra so no server overloads,
      weather cyclons or any other gang clans {"can't"} stop our birdz on its
      way to you!
    </h1>

    <p style={{ color: 'white', fontSize: '4em', position: 'relative' }}>
      Stay Tuned!
    </p>
  </div>
);

const DiscordLogo = () => (
  <svg
    width="256"
    height="293"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid"
    style={{ transform: 'scale(0.2)' }}
  >
    <path
      d="M226.011 0H29.99C13.459 0 0 13.458 0 30.135v197.778c0 16.677 13.458 30.135 29.989 30.135h165.888l-7.754-27.063 18.725 17.408 17.7 16.384L256 292.571V30.135C256 13.458 242.542 0 226.011 0zm-56.466 191.05s-5.266-6.291-9.655-11.85c19.164-5.413 26.478-17.408 26.478-17.408-5.998 3.95-11.703 6.73-16.823 8.63-7.314 3.073-14.336 5.12-21.211 6.291-14.044 2.633-26.917 1.902-37.888-.146-8.339-1.61-15.507-3.95-21.504-6.29-3.365-1.317-7.022-2.926-10.68-4.974-.438-.293-.877-.439-1.316-.732-.292-.146-.439-.292-.585-.438-2.633-1.463-4.096-2.487-4.096-2.487s7.022 11.703 25.6 17.261c-4.388 5.56-9.801 12.142-9.801 12.142-32.33-1.024-44.617-22.235-44.617-22.235 0-47.104 21.065-85.285 21.065-85.285 21.065-15.799 41.106-15.36 41.106-15.36l1.463 1.756C80.75 77.53 68.608 89.088 68.608 89.088s3.218-1.755 8.63-4.242c15.653-6.876 28.088-8.777 33.208-9.216.877-.147 1.609-.293 2.487-.293a123.776 123.776 0 0129.55-.292c13.896 1.609 28.818 5.705 44.031 14.043 0 0-11.556-10.971-36.425-18.578l2.048-2.34s20.041-.44 41.106 15.36c0 0 21.066 38.18 21.066 85.284 0 0-12.435 21.211-44.764 22.235zm-68.023-68.316c-8.338 0-14.92 7.314-14.92 16.237 0 8.924 6.728 16.238 14.92 16.238 8.339 0 14.921-7.314 14.921-16.238.147-8.923-6.582-16.237-14.92-16.237m53.394 0c-8.339 0-14.922 7.314-14.922 16.237 0 8.924 6.73 16.238 14.922 16.238 8.338 0 14.92-7.314 14.92-16.238 0-8.923-6.582-16.237-14.92-16.237"
      fill="#c0ffff"
    />
  </svg>
);

const TwitterLogo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="266.667"
    height="216.715"
    viewBox="0 0 6701 5446"
    shape-rendering="geometricPrecision"
    text-rendering="geometricPrecision"
    image-rendering="optimizeQuality"
    fill-rule="evenodd"
    clip-rule="evenodd"
    style={{ transform: 'scale(0.25)' }}
  >
    <path
      d="M6701 645c-247 109-512 183-790 216 284-170 502-440 604-761-266 158-560 272-873 334C5391 167 5034 0 4638 0c-759 0-1375 616-1375 1375 0 108 12 213 36 313-1143-57-2156-605-2834-1437-118 203-186 439-186 691 0 477 243 898 612 1144-225-7-437-69-623-172v17c0 666 474 1222 1103 1348-115 31-237 48-362 48-89 0-175-9-259-25 175 546 683 944 1284 955-471 369-1063 589-1708 589-111 0-220-7-328-19 608 390 1331 618 2108 618 2529 0 3912-2095 3912-3912 0-60-1-119-4-178 269-194 502-436 686-712z"
      fill="#c0ffff"
    />
  </svg>
);
