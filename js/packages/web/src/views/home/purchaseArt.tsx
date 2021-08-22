import React, { useEffect, useState } from 'react';
import { Button, Progress, Typography, Row, Col, Divider, Image} from 'antd';
import { web3, Provider, Program } from '@project-serum/anchor';
import { useWallet } from '@oyster/common';
import idl from '../../config/simple_token_sale.json';
import type { MasterAccount, Receipt } from './types';
import { Confetti } from './../../components/Confetti';

const { Title } = Typography;
const style = { background: '#0092ff', padding: '10px' };
const masterAccountAddress = 'HWJth7QE2C2DQqgnk5ZHd8CzWC4afCMaKrPWoNQDQJWW';
if (masterAccountAddress === undefined) {
  throw new Error('The master account address is not defined');
}

type Program = any;

const phases = {
  '1': 1111,
  '2': 2222,
  '3': 3333,
};
const collectionSize = 3333;

export const PurchaseArt = () => {
  const { wallet, connected } = useWallet();
  const [program, setProgram] = useState<Program>(null);
  const [account, setAccount] = useState<MasterAccount>();
  const [isLoading, setIsLoading] = useState(false);
  const [ifDealMade, setDealMade] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const connectToProgram = async () => {
      const masterAccountPubkey = new web3.PublicKey(masterAccountAddress);
      const provider = Provider.env();

      console.log('idl', idl);

      // TODO: Make it work
      // const program = new Program(idl, masterAccountPubkey, provider);
      // const masterAccount = await program.account.masterAccount.fetch(masterAccountPubkey);

      // mock it for now
      const program = {};
      const masterAccount = {
        counter: 2455,
        authority: masterAccountAddress,
        numTokens: 2454,
      };
      const account = masterAccount as MasterAccount;

      setProgram(program);
      setAccount(account);
    };

    connectToProgram();
  }, []);

  const purchase = async () => {
    if (!wallet?.publicKey) {
      return;
    }

    try {
      if (!account) {
        throw new Error('No connection with master account.');
      }

      setIsProcessing(true);

      const payer = wallet.publicKey.toBase58();
      const masterAccountPubkey = new web3.PublicKey(masterAccountAddress);
      const bump = {};
      const pda = {};

      // TODO: Fix it
      // const txId = await program.rpc.purchase(account.counter, bump, {
      //   accounts: {
      //     payer,
      //     receipt: pda,
      //     authority: account.authority,
      //     masterAccount: masterAccountPubkey,
      //     systemProgram: web3.SystemProgram.programId,
      //   },
      // });

      setDealMade(true);
    } catch (error) {
      console.warn('Error occured while purchasing the item: ', error);
    } finally {
      setIsProcessing(false);
      setIsDone(true);
    }
  };

  if (isLoading) return <div>loading...</div>;

  const ifAccountExist = account && !!account.counter && !!account.numTokens;
  const progressValue =
    account && ifAccountExist
      ? Math.round((account.counter / collectionSize) * 100)
      : null;

  const price = getPrice(account?.counter) ?? 0;

  const btnText = getPurchaseBtnText(connected, isProcessing, isDone, price);

  return (
    <div className="purchase-screen">
      <Title level={2} className="welcome-text">Introducing Thugbirdz: OG Collection</Title>
      <img src = 'hero.gif'/>
      {ifDealMade ? <Confetti /> : null}

      {progressValue === 100 ? (
        <h1 className="highlight sold-out">SOLD OUT</h1>
      ) : null}

      {/* {!!progressValue && progressValue < 100 && (
        <>
          <Button
            type="primary"
            shape="round"
            size="large"
            className="app-btn purchase-btn"
            onClick={purchase}
            disabled={!connected || ifDealMade}
          >
            {btnText}
          </Button>
          <div className="only-left-text">
            Only{' '}
            <span className="highlight">
              {collectionSize - account?.counter}
            </span>{' '}
            of <span className="highlight">{collectionSize}</span> remaining
          </div>
          <Progress percent={progressValue} />
        </>
      )} */}
    <br></br>
    <br></br>
    <br></br>
    <Title level={3} className="welcome-text">Possible features</Title>
    
  </div>
  );
};

const getPrice = (numberOfMinted: number) => {
  if (!numberOfMinted) return null;
  if (numberOfMinted <= phases[1]) return 1;
  else if (numberOfMinted <= phases[2]) return 2;
  else return 3;
};

const getPurchaseBtnText = (
  connected: boolean,
  isProcessing: boolean,
  isDone: boolean,
  price: number,
) => {
  if (!connected) return 'connect your wallet fool';
  else if (isProcessing) return 'processing request...';
  else if (isDone) return 'your bird is on its way...';
  else return `Mint bird for ◎${price} SOL!`;
};
