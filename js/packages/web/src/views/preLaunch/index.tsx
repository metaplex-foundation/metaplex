import React, {useCallback, useEffect, useState} from 'react'

import {Button, Input, Layout, Form, Modal} from "antd";
import {ModalProps} from 'antd/lib/modal';
import {LogoLink} from "../../components/AppBar";
import {textContent} from "./textContent";
import useMagicLink from "../../hooks/magicLink/useMagicLink";

const {Content} = Layout;

export interface GotEmailButtonProps
  extends ModalProps,
    React.RefAttributes<HTMLElement> {
  titleText: string,
  descriptionText: string,
  visible?: boolean;
  extraButton?: JSX.Element,
}

const PreLaunchModal = (props: GotEmailButtonProps) => {
  const {onCancel, visible, titleText, descriptionText, extraButton, className, ...rest} = props;
  const handleOnCancel = useCallback((e) => {
    if (onCancel) return onCancel(e);
    return null;
  }, [onCancel])

  return (
    <Modal
      visible={visible}
      onCancel={(e) => handleOnCancel(e)}
      footer={null}
      className={`pre-modal ${className || ''}`}
      closeIcon={<img src={"/modals/close.svg"}/>}
      {...rest}
    >
      <span className={"how-to-step"}>
        <span className={'how-to-logo ok s64'}></span>
      </span>
      <div className={"got-title"}>
        {titleText}
      </div>
      <div className={"got-description"}>
        {descriptionText}
      </div>
      {extraButton && (
        {extraButton}
      )}
    </Modal>
  );
}

export const PreLaunchView = () => {
  const [email, setEmail] = useState("")
  const [walletAddress, setWalletAddress] = useState("")
  const [verified, setVerified] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [gotVisible, setGotVisible] = useState(false)
  const [sentVisible, setSentVisible] = useState(false)
  const auth = useMagicLink()
  const verifyUser = async () => {
    if (auth.loggedIn) {
      const user = await auth.magic.user.getMetadata();
      setGotVisible(false)
      setEmail(user.email)
      setVerified(true)
    }
  }
  const saveTypeForm = async () => {
    setSubmitted(true)


  }
  useEffect(() => {
    verifyUser()
  }, [auth.loggedIn])
  return (
    <Layout id={'pre-launch-layout'}>
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
        onCancel={() => setSentVisible(false)}
      />
      <Layout id={'width-layout'}>
        {!verified ? (
          <Content
            className={"pre-main-content"}
          >
            <div className={"upper-content"}>
              <div className={"logo"}>
                <LogoLink/>
              </div>
              <div className={"pre-title"}>
                {textContent.mainTitle}
              </div>
              <div className={"pre-context"}>
                {textContent.titleDescription}
              </div>
              <div className={"pre-input"}>
                <Form
                  className={'footer-sign-up'}
                  onFinish={(values) => {
                     auth.login(values.email)
                    setGotVisible(true)
                  }}
                >
                  <Form.Item
                    name='email'
                    rules={[
                      {
                        type: 'email',message: 'Input is not a valid email!'
                      },
                      { required: true, message: 'Please input your email!' }
                    ]}
                    style={{ display: 'flex !important'}}
                  >
                    <Input
                      className={'footer-input'}
                      placeholder="Email Address"
                      name="email"
                    />
                  </Form.Item>
                  <Button className={"secondary-btn sign-up"} htmlType="submit">Sign Up</Button>
                </Form>
              </div>
            </div>
            <div className={"lower-content"}>
              <div className={"how-to-get"}>
                How to get your NFT:
              </div>
              <div className={"how-to-step fst"}>
                <span className={"how-to-logo email"}></span>
                <span className={"how-to-description"}>
                  Enter your email address. We&apos;ll send you an email so you can verify your account. (One entry per email.)
                </span>
              </div>
              <div className={"how-to-step"}>
                <span className={"how-to-logo wallet"}></span>
                <span className={"how-to-description"}>
                  After verification, we&apos;ll help you set up a Solana crypto-wallet. This is where we&apos;ll send the NFT.
                </span>
              </div>
            </div>
          </Content>
        ) : verified && !submitted ? (
          <Content
            className={"pre-main-content second"}
          >
            <div className={"logo"}>
              <LogoLink/>
            </div>
            <div className={"verify-message"}>
              <span>Thanks for verifying</span>
              <span className={"email"}>{email}</span>
            </div>
            <div className={"pre-input wallet"}>
              <Input value={walletAddress} placeholder={"Wallet address"}
                     onChange={(val) => setWalletAddress(val.target.value)} />
              <Button className={"secondary-btn sign-up"} onClick={() => saveTypeForm()}>Submit</Button>
            </div>
          </Content>
        ) : (
          <Content
            className={"pre-main-content"}
          >
          </Content>
        )}
      </Layout>
    </Layout>
  );
}
