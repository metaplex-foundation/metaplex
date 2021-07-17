import React, { useState } from 'react';
import { Layout, Col, Button, Menu, Dropdown, Table, Tag, Space } from 'antd';
import './index.less';
import { sendTransaction, useConnection, useWallet } from '@oyster/common';
import { ConnectButton } from '../../components/ConnectButton'

import * as web3 from "@solana/web3.js";
import OUTLINE_IMG from './outline.jpg';
import { useConfetti } from '../../components/Confetti';
import useWindowDimensions from '../../utils/layout';

const { Content } = Layout;
const columns = [
  {
    title: '',
    dataIndex: 'key',
    key: 'key',
    render: (d: string) => <div style={{ textAlign: 'left' }}>{d}</div>
  },
  {
    title: '',
    dataIndex: 'value',
    key: 'value',
    render: (d: string) => <div style={{ textAlign: 'right' }}>{d}</div>
  },
];

const data = [
  {
    key: 'Clan: Apebottom',
    value: '0.25%',
  },
  {
    key: 'Sign: Gemini',
    value: '0.25%',
  },
  {
    key: 'type: Gorilla',
    value: '0.25%',
  },
  {
    key: 'Body: Black',
    value: '0.25%',
  },
  {
    key: 'Mouth: Rose',
    value: '0.25%',
  },
  {
    key: 'Eyes: Blue',
    value: '0.25%',
  },
  {
    key: 'Hair: Short',
    value: '0.25%',
  },
  {
    key: 'Clothes: Vape',
    value: '0.25%',
  },
  {
    key: 'Background: Bamboo Green',
    value: '0.25%',
  },
  {
    key: 'Accessories: Gold Earring',
    value: '0.25%',
  },
  {
    key: 'Overall rarity',
    value: '0.25%',
  },

]

export const HomeView = () => {
  const connection = useConnection();
  const { wallet, connected } = useWallet();
  const [apes, setApes] = useState<string[]>([])
  const [sendingTransaction, setSendingTransaction] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [selectedApe, setSelectedApe] = useState<{ [key: string]: string }>()
  const confetti = useConfetti();
  const { width } = useWindowDimensions();

  const overlay = (
    <Menu>
      {apes.map(ape => (
        <Menu.Item>
          {ape}
        </Menu.Item>
      ))}
    </Menu>
  )

  const handleSignTransaction = async () => {
    setSendingTransaction(true);
    if (wallet?.publicKey) {
      const transactionInstr = web3.SystemProgram.transfer({
        fromPubkey: new web3.PublicKey(wallet?.publicKey),
        toPubkey: new web3.PublicKey('CRbLyPomfBrLJrx5SY3c49WwncSbanaXYjk9C6x6SPN1'),
        lamports: 0.5 * web3.LAMPORTS_PER_SOL,
      });

      const b = await connection.getBalance(
        new web3.PublicKey(wallet?.publicKey),
      )

      const tx = await sendTransaction(connection, wallet, [transactionInstr], []).catch(
        e => alert('It looks like you have insufficient funds!')
      ) as { txid: string };
      setSendingTransaction(false);
      if (!tx) {
        return
      }
      setTxHash(tx.txid);
      console.log(tx.txid)
      setApes([...apes, tx.txid]);
      setSelectedApe({
        name: 'Homeboy Kong'
      });
      confetti.dropConfetti();
    } else {
      // error
    }
  }

  return (
    <div className="home">

      <Layout style={{ margin: 0, alignItems: 'center' }}>
        <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Col style={{ width: '100%' }}>
            {<div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'column',
                  padding: width > 480  ? '2rem' : '1rem'
                }}>
                <div style={{
                  width:  width > 480 ? 420 : 320,
                  height: width > 480 ? 520 : 380,
                  boxShadow: '0px 5px 15px 1px rgba(0,0,0,0.16)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexDirection: 'column',
                  backgroundColor: 'white',
                  padding: '1rem',
                  marginBottom: '0.5rem'
                }}>
                  <div
                    style={{
                      height: width > 480 ? 356 : 256,
                      width: width > 480 ? 356 : 256,
                      margin: '1rem auto',
                      border: '1px solid #ccc'
                    }}>
                    <img style={{ width: '100%' }} src={OUTLINE_IMG}></img>
                  </div>

                  <div style={{
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                    color: 'black',
                  }}>
                    {(
                      connected && !txHash && (
                        <>
                          <Button style={{ margin: '0.5rem 0' }} loading={sendingTransaction} type="primary" onClick={handleSignTransaction}>
                            {!sendingTransaction ? 'Adopt Ape' : 'Adopting Ape'}
                          </Button>

                          {!sendingTransaction && (
                            <span>
                              1 Ape = 5 SOL
                            </span>
                          )}

                        </>
                      )

                    )}
                    {sendingTransaction && (
                      <span style={{ color: 'black' }}>Please approve in Wallet</span>
                    )}
                    {(
                      connected && txHash && (<>
                        <div style={{ color: 'black', textAlign: 'center' }}>
                          <strong style={{ color: 'black', fontSize: '1.25rem' }}>{selectedApe?.name}</strong>
                          <br />
                          <span>has been adopted</span>
                        </div>
                      </>)
                    )}
                    {(!connected && <>
                      <ConnectButton style={{ margin: '0.5rem 0' }} type="primary"></ConnectButton>
                    </>)}
                  </div>
                </div>

                {connected && (
                  <>
                    {apes.length > 1 && (
                      <Dropdown overlay={overlay}>
                        <h2 style={{ textAlign: 'center', width: 420, margin: '2rem auto 0', color: 'black' }}>{selectedApe?.name}</h2>
                      </Dropdown>
                    )}
                  </>
                )}

                {connected && !!txHash && (
                  <>
                    <Button style={{ margin: '2rem auto',
                        cursor: 'pointer'
                    
                  }} type="primary" onClick={() => {
                      setTxHash('');
                      setSelectedApe(undefined);
                    }}>
                      Adopt another
                    </Button>
                  </>
                )}

                {selectedApe && (
                  <section style={{ width: 420 }}>
                    <h2 style={{ marginBottom: '2rem' }}>Attributes:</h2>
                    <Table columns={columns} dataSource={data} pagination={false} style={{ width: '100%' }} />
                  </section>
                )}
              </div>
            </div>}
          </Col>
        </Content>
      </Layout>

    </div>
  );
};
