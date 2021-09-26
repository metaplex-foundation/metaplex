import React, { useCallback, useEffect, useState } from 'react';

import { Button, Input, Layout, Modal, Form, Spin } from 'antd';
import { ModalProps } from 'antd/lib/modal';
import { LogoLink } from '../../components/AppBar';
import { textContent } from './textContent';
import useMagicLink from '../../hooks/magicLink/useMagicLink';
import { shortenAddress } from '@oyster/common';
import { getUser, getWalletAddress, saveUser } from './userInfo';

const { Content } = Layout;

export interface GotEmailButtonProps
  extends ModalProps,
    React.RefAttributes<HTMLElement> {
  titleText: string;
  descriptionText: string;
  visible?: boolean;
  extraButton?: JSX.Element;
}

const DiscordButton = () => (
  <a
    className={'discord-button'}
    target={'_blank'}
    href={'https://discord.com/invite/metaplex'}
  >
    <span></span> Join our Discord
  </a>
);

const PreLaunchModal = (props: GotEmailButtonProps) => {
  const {
    onCancel,
    visible,
    titleText,
    descriptionText,
    extraButton,
    className,
    ...rest
  } = props;
  const handleOnCancel = useCallback(
    e => {
      if (onCancel) return onCancel(e);
      return null;
    },
    [onCancel],
  );

  return (
    <Modal
      visible={visible}
      onCancel={e => handleOnCancel(e)}
      footer={null}
      className={`pre-modal ${className || ''}`}
      closeIcon={<img src={'/modals/close.svg'} />}
      {...rest}
    >
      <span className={'how-to-step'}>
        <span className={'how-to-logo ok s64'}></span>
      </span>
      <div className={'got-title'}>{titleText}</div>
      <div className={'got-description'}>{descriptionText}</div>
      {extraButton && extraButton}
    </Modal>
  );
};

export const PreLaunchView = () => {
  const [email, setEmail] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [verified, setVerified] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [gotVisible, setGotVisible] = useState(false);
  const [sentVisible, setSentVisible] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const auth = useMagicLink();

  const handleSaveWallet = async (verifiedEmail, wallet) => {
    await saveUser(verifiedEmail, wallet, () => {
      setSentVisible(true);
      setSubmitted(true);
      auth.logout();
    });
  };

  const verifyUser = async () => {
    if (auth.loggedIn) {
      setLoadingUser(true);
      const verifiedEmail = (await auth.magic.user.getMetadata()).email;
      setEmail(verifiedEmail);
      const user = await getUser(verifiedEmail);
      setVerified(true);
      if (user) {
        const wallet = await getWalletAddress(user);
        setWalletAddress(wallet);
        setSentVisible(true);
        setSubmitted(true);
        auth.logout();
      }
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    verifyUser();
  }, [auth.loggedIn]);
  return (
    <Layout id={'pre-launch-layout'}>
      <div className={'main-asset-banner'}>
        <div className={'right-gradient'}></div>
      </div>
      <PreLaunchModal
        titleText={textContent.gotEmail}
        descriptionText={textContent.gotEmailDescription}
        visible={gotVisible}
        onCancel={() => {
          setGotVisible(false);
          //setVerified(true) //remove later
        }}
      />
      <PreLaunchModal
        titleText={textContent.sentNFT}
        descriptionText={textContent.sentNFTDescription}
        visible={sentVisible}
        onCancel={() => {
          setSentVisible(false);
          setSubmitted(true);
        }}
        extraButton={<DiscordButton />}
      />
      <Layout id={'width-layout'}>
        {!verified ? (
          <Content className={'pre-main-content'}>
            <div className={'upper-content'}>
              <div className={'logo'}>
                <LogoLink />
              </div>
              <div className={'pre-title'}>{textContent.mainTitle}</div>
              <div className={'pre-context'}>
                {textContent.titleDescription}
              </div>
              <div className={'pre-input'}>
                {auth.loading || loadingUser ? (
                  <Spin />
                ) : (
                  <Form
                    className={'footer-sign-up'}
                    onFinish={values => {
                      auth.login(values.email);
                      setGotVisible(true);
                    }}
                  >
                    <Form.Item
                      name="email"
                      rules={[
                        {
                          type: 'email',
                          message: 'Input is not a valid email!',
                        },
                        { required: true, message: 'Please input your email!' },
                      ]}
                      style={{ display: 'flex !important' }}
                    >
                      <Input
                        className={'footer-input'}
                        placeholder="Email Address"
                        name="email"
                      />
                    </Form.Item>
                    <Button
                      className={'secondary-btn sign-up'}
                      htmlType="submit"
                    >
                      Sign Up
                    </Button>
                  </Form>
                )}
              </div>
            </div>
            <div className={'lower-content'}>
              <div className={'how-to-get'}>How to get your NFT:</div>
              <div className={'how-to-step fst'}>
                <span className={'how-to-logo email'}></span>
                <span className={'how-to-description'}>
                  Enter your email address. We&apos;ll send you an email so you
                  can verify your account. (One entry per email.)
                </span>
              </div>
              <div className={'how-to-step'}>
                <span className={'how-to-logo wallet'}></span>
                <span className={'how-to-description'}>
                  After verification, we&apos;ll help you set up a Solana
                  crypto-wallet. This is where we&apos;ll send the NFT.
                </span>
              </div>
            </div>
          </Content>
        ) : verified && !submitted ? (
          <Content className={'pre-main-content second'}>
            <div className={'logo'}>
              <LogoLink />
            </div>
            <div className={'verify-message'}>
              <span>Thanks for verifying</span>
              <span className={'high-light'}>{email}</span>
            </div>
            <div className={'verify-message mb32'}>
              <span>Paste your Solana wallet address here.</span>
            </div>
            {loadingUser ? (
              <Spin />
            ) : (
              <div className={'pre-input wallet'}>
                <Input
                  value={walletAddress}
                  placeholder={'Wallet address'}
                  onChange={val => setWalletAddress(val.target.value)}
                />
                <Button
                  className={'secondary-btn sign-up'}
                  onClick={async () => {
                    await handleSaveWallet(email, walletAddress);
                  }}
                >
                  Submit
                </Button>
              </div>
            )}
            <div className={'verify-message mb40'}>
              <span>How to create a wallet:</span>
            </div>
            <div className={'steps'}>
              <div className={'step'}>
                <span className={'step-title'}>Step 1</span>
                <span className={'step-desc'}>Install Phantom.</span>
                <div className={'step-asset step1'}></div>
                <span className={'step-desc'}>
                  Install the Phantom wallet in Google Chrome, Firefox, Brave,
                  or Edge via Phantom’s website. It’s free to use!
                </span>
              </div>
              <div className={'step'}>
                <span className={'step-title'}>Step 2</span>
                <span className={'step-desc'}>Create a new wallet.</span>
                <div className={'step-asset step2'}></div>
                <span className={'step-desc'}>
                  Once it’s installed, follow the steps to create a new wallet.
                </span>
              </div>
              <div className={'step'}>
                <span className={'step-title'}>Step 3</span>
                <span className={'step-desc'}>Copy your wallet address.</span>
                <div className={'step-asset step3'}></div>
                <span className={'step-desc'}>
                  Once you’re signed in click the top bar to copy your wallet
                  address. In Phantom it displays a condensed version (ex:
                  CRWJ...ch67), but when you paste it here, you should see a
                  long string of letters and numbers.
                </span>
              </div>
            </div>
          </Content>
        ) : (
          <Content className={'pre-main-content third'}>
            <div className={'logo'}>
              <LogoLink />
            </div>

            <div className={'verify-message'}>
              <span className={'display-block mb32'}>
                Your NFT is on the way.
              </span>
              <span className={'high-light'} style={{ marginLeft: 0 }}>
                {email}
              </span>
              <span className={'high-light'}>
                {shortenAddress(walletAddress)}
              </span>
            </div>
            <DiscordButton />
          </Content>
        )}
      </Layout>
    </Layout>
  );
};

export const ComingSoonView = () => {
  return (
    <Layout id={'pre-launch-layout'}>
      <div className={'main-asset-banner'}>
        {/*Gradient does not match*/}
        {/*<div className={"right-gradient"}></div>*/}
      </div>
      <Layout id={'width-layout'}>
        <Content className={'pre-main-content'}>
          <div className={'logo'}>
            <LogoLink />
          </div>
          <div className={'full-height-content'}>
            <div className={'pre-title'}>{textContent.comingSoonTitle}</div>
            <div className={'pre-context'}>
              {textContent.comingSoonTitleDescription}
            </div>
            <div className={'pre-input'}>
              <Form
                className={'footer-sign-up'}
                onFinish={values => {
                  console.log(values);
                }}
              >
                <Form.Item
                  name="email"
                  rules={[
                    {
                      type: 'email',
                      message: 'Input is not a valid email!',
                    },
                    { required: true, message: 'Please input your email!' },
                  ]}
                  style={{ display: 'flex !important' }}
                >
                  <Input
                    className={'footer-input'}
                    placeholder="Email Address"
                    name="email"
                  />
                </Form.Item>
                <Button className={'secondary-btn sign-up'} htmlType="submit">
                  Sign Up
                </Button>
              </Form>
            </div>
          </div>
          <div className={'lower-content'}>
            <DiscordButton />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};
