import React, { useState } from 'react';
import { Layout, Col, Button, Typography } from 'antd';
import { MetaplexModal, useWallet } from '@oyster/common';
import useWindowDimensions from '../../utils/layout';
import {useApes} from '../../contexts'
import {AttributesTable} from './attributesTable';
import { Link } from 'react-router-dom';

const OUTLINE_IMG = '/img/outline.jpg';
const ape1  = '/img/ape1.jpeg';
const ape2  = '/img/ape2.jpeg';
const ape3  = '/img/ape3.jpeg';
const ape4  = '/img/ape4.jpeg';
const ape5  = '/img/ape5.jpeg';
const ape6  = '/img/ape6.jpeg';

const apeImgs = [
  ape1,
  ape2,
  ape3,
  ape4,
  ape5,
  ape6,
]


const apeGrid = (width: number) =>
  apeImgs.map(img => (
    <img
      className="grid-img"
      key={img}
      style={{
        width: width > 768 ? 'calc(33% - 1rem)' : 'calc(50% - 1rem)',
        margin: '0.5rem',
        borderRadius: '0.5rem',
        overflow: 'hidden'
      }}
      src={img}
    ></img>
  ));

const { Content } = Layout;
const { Title } = Typography;

export const HomeView = () => {
  const { connected } = useWallet();
  const {myApes} = useApes();
  const [txHash, setTxHash] = useState('');
  const [modal, setModal] = useState({
    visible: false,
    content: '',
    okText: 'Okay',
    onOk: () => {},
    onCancel: () => {
      setModal({...modal, visible: false})
    }
  });
  const { width } = useWindowDimensions();

  return (
    <div className="home">
      <Layout style={{ margin: 0, alignItems: 'center' }}>
        <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Col style={{ width: '100%' }}>
            <br />
            <Title level={3} style={{ textAlign: 'center' }}>
              Introducing ApeShit Season I
            </Title>
            <Title style={{ marginTop: '1rem', textAlign: 'center' }}>The Gorilla</Title>

            <div id="counter" style={{ textAlign: 'center', color: 'black' }}>
              {/* Gorillas looking for a new home: {apesLoaded ? 2204 - allApes.length : 2500} / 2500 */}
              {/* SOLD OUT! */}
            </div>

            {connected && myApes.length && (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <Link
                  to="/my-apes"
                  style={{ color: 'black', textDecoration: 'underline' }}
                >
                  Show my apes ({myApes.length})
                </Link>
              </div>
            )}

            {
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                    padding: width > 480 ? '2rem' : '1rem',
                  }}
                >
                  <div
                    style={{
                      width: width > 480 ? 420 : 320,
                      boxShadow: '0px 5px 15px 1px rgba(0,0,0,0.16)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexDirection: 'column',
                      backgroundColor: 'white',
                      padding: '1rem',
                      marginBottom: '0.5rem',
                      borderRadius: '0.5rem'
                    }}
                  >
                    <div
                      style={{
                        height: width > 480 ? 356 : 256,
                        width: width > 480 ? 356 : 256,
                        margin: '1rem auto',
                        border: '1px solid #ccc',
                        borderRadius: '0.5rem',
                        overflow: 'auto'
                      }}
                    >
                      <img
                        style={{ width: '100%' }}
                        src={OUTLINE_IMG}
                      ></img>
                    </div>

                    <div
                      style={{
                        height: '100%',
                        width: 'calc(100% - 2rem)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexDirection: 'column',
                        color: 'black',
                      }}
                    >
                        {/* <span style={{  margin: '0.5rem 0px' }}>
                          1 Ape = 5 SOL
                        </span> */}
                      {/* {connected && !txHash && (
                        <>
                          {sendingTransaction && (
                            <span
                              style={{ color: 'black', margin: '0.5rem 0px' }}
                            >
                              Please approve in Wallet
                            </span>
                          )}
                          <Button
                            shape="round"
                            size="large"
                            style={{
                              margin: '0.5rem 0',
                              width: '100%',
                              padding: '0 1rem',
                            }}
                            loading={sendingTransaction}
                            type="primary"
                            onClick={handleSignTransaction}
                          >
                            {!sendingTransaction ? 'Adopt Ape' : 'Adopting Ape'}
                          </Button>
                        </>
                      )} */}

                      {/* {connected && !!txHash && (
                        <>
                          <Button
                            shape="round"
                            size="large"
                            style={{
                              cursor: 'pointer',
                              margin: '0.5rem 0',
                              width: '100%',
                              padding: '0 1rem',
                              color: '#0a8000'
                            }}
                            onClick={() => {
                              handleSignTransaction()
                            }}
                          >
                            Adopt another
                          </Button>
                        </>
                      )} */}

                    <div style={{ textAlign: 'center' }}>
                        <a style={{ margin: '0 auto 1rem', display: 'inline-block' }} href="https://solanart.io/collections/apeshit">
                            <Button shape="round" size="large" type="primary" style={{
                                cursor: 'pointer'
                            }}>
                                Solanart (recommended)
                            </Button>
                        </a>
                        <Link style={{ margin: '0 auto', display: 'inline-block' }} to="/auctions">
                            <Button shape="round" size="large" type="primary" style={{
                                cursor: 'pointer'
                            }}>
                                Auctions
                            </Button>
                        </Link>
                    </div>
                      {/* {!connected && ( */}
                        <>
                          {/* <ConnectButton
                            style={{ margin: '0.5rem 1rem', width: '100%' }}
                            type="primary"
                            size="large"
                            shape="round"
                          >
                            Connect to adopt
                          </ConnectButton> */}
                        </>
                      {/* )} */}
                    </div>
                  </div>

                  {!txHash && (
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                      <a href="https://gorillafund.org/" target="_blank">
                        <img
                          alt="Dian Fossey Gorilla Fund Logo"
                          data-srcset="https://gorillafund.org/wp-content/uploads/2020/11/image009.jpg 1017w, https://gorillafund.org/wp-content/uploads/2020/11/image009-300x161.jpg 300w, https://gorillafund.org/wp-content/uploads/2020/11/image009-768x413.jpg 768w"
                          data-src="https://gorillafund.org/wp-content/uploads/2020/11/image009.jpg"
                          data-sizes="(max-width: 1017px) 100vw, 1017px"
                          src="https://gorillafund.org/wp-content/uploads/2020/11/image009.jpg"
                          sizes="(max-width: 1017px) 100vw, 1017px"
                          srcSet="https://gorillafund.org/wp-content/uploads/2020/11/image009.jpg 1017w, https://gorillafund.org/wp-content/uploads/2020/11/image009-300x161.jpg 300w, https://gorillafund.org/wp-content/uploads/2020/11/image009-768x413.jpg 768w"
                          style={{
                            margin: '1rem auto',
                            width: '100%',
                            maxWidth: 240,
                          }}
                        />
                      </a>
                      <br />
                      <br />

                      <Title level={5}>
                        10% of all proceeds will go to the Dian Fossey Gorilla
                        Fund International.
                      </Title>
                    </div>
                  )}
                </div>
              </div>
            }

            <br />
            {apeGrid(width)}

            <br />

            <p
              style={{
                textAlign: 'center',
                maxWidth: 480,
                margin: '1rem auto',
                color: 'black',
              }}
            >
              After adoption, a randomly generated ape will be sent to your
              wallet, and you will be the new adopted guardian of said ape.
            </p>

            {!txHash && (
              <>
                <hr />
                <br />
                <Title level={2} style={{ textAlign: 'center' }}>
                  Possible Features
                </Title>
                <br />
                <AttributesTable />
              </>
            )}
          </Col>
        </Content>
      </Layout>
      <MetaplexModal
        {...modal}
      >
        {modal.content}
      </MetaplexModal>
      {/* <MetaplexModal
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
        }}
        onOk={() => {
          debugger
        }}
        
      >
        {modalContent}
      </MetaplexModal> */}
    </div>
  );
};
