import { shortenAddress } from '@oyster/common';
import { Button, Form, Input, Layout, Modal, Spin } from 'antd';
import { ModalProps } from 'antd/lib/modal';
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useMagicLink from '../../hooks/magicLink/useMagicLink';
import { textContent } from './textContent';
import { getUser, getWalletAddress, saveUser } from './userInfo';

const { Content } = Layout;

const LogoLink = () => (
  <Link to="/">
    <img src="metaplex-logo.svg" />
  </Link>
);

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
    target="_blank"
    rel="noopener noreferrer"
    href="https://discord.com/invite/metaplex"
  >
    Join our Discord
  </a>
);

const PreLaunchModal = (props: GotEmailButtonProps) => {
  const {
    onCancel,
    visible,
    titleText,
    descriptionText,
    extraButton,
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
      closeIcon={<img src="/modals/close.svg" />}
      {...rest}
    >
      <div>{titleText}</div>
      <div>{descriptionText}</div>
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

  const handleSaveWallet = async (verifiedEmail: string, wallet: string) => {
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
    <Layout>
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
      <Layout>
        {!verified ? (
          <Content>
            <div>
              <div>
                <LogoLink />
              </div>
              <div>{textContent.mainTitle}</div>
              <div>{textContent.titleDescription}</div>
              <div>
                {auth.loading || loadingUser ? (
                  <Spin />
                ) : (
                  <Form
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
                    >
                      <Input placeholder="Email Address" name="email" />
                    </Form.Item>
                    <Button htmlType="submit">Sign Up</Button>
                  </Form>
                )}
              </div>
            </div>
            <div>
              <div>How to get your NFT:</div>
              <div>
                Enter your email address. We&apos;ll send you an email so you
                can verify your account. (One entry per email.)
              </div>
              <div>
                After verification, we&apos;ll help you set up a Solana
                crypto-wallet. This is where we&apos;ll send the NFT.
              </div>
            </div>
          </Content>
        ) : verified && !submitted ? (
          <Content>
            <div>
              <LogoLink />
            </div>
            <div>
              <span>Thanks for verifying</span>
              <span>{email}</span>
            </div>
            <div>Paste your Solana wallet address here.</div>
            {loadingUser ? (
              <Spin />
            ) : (
              <div>
                <Input
                  value={walletAddress}
                  placeholder="Wallet address"
                  onChange={val => setWalletAddress(val.target.value)}
                />
                <Button
                  onClick={async () => {
                    await handleSaveWallet(email, walletAddress);
                  }}
                >
                  Submit
                </Button>
              </div>
            )}
            <div>How to create a wallet:</div>
            <div>
              <div>
                <span>Step 1</span>
                <span>Install Phantom.</span>
                <span>
                  Install the Phantom wallet in Google Chrome, Firefox, Brave,
                  or Edge via Phantom’s website. It’s free to use!
                </span>
              </div>
              <div>
                <span>Step 2</span>
                <span>Create a new wallet.</span>
                <span>
                  Once it’s installed, follow the steps to create a new wallet.
                </span>
              </div>
              <div>
                <span>Step 3</span>
                <span>Copy your wallet address.</span>
                <span>
                  Once you’re signed in click the top bar to copy your wallet
                  address. In Phantom it displays a condensed version (ex:
                  CRWJ...ch67), but when you paste it here, you should see a
                  long string of letters and numbers.
                </span>
              </div>
            </div>
          </Content>
        ) : (
          <Content>
            <div>
              <LogoLink />
            </div>

            <div>
              <span>Your NFT is on the way.</span>
              <span>{email}</span>
              <span>{shortenAddress(walletAddress)}</span>
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
    <Layout>
      <Layout>
        <Content>
          <LogoLink />
          <div>
            <div>{textContent.comingSoonTitle}</div>
            <div>{textContent.comingSoonTitleDescription}</div>
            <div>
              <Form
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
                >
                  <Input placeholder="Email Address" name="email" />
                </Form.Item>
                <Button htmlType="submit">Sign Up</Button>
              </Form>
            </div>
          </div>
          <div>
            <DiscordButton />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};
