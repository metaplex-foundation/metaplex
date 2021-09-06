import React, {useState} from 'react'

import {Button, Col, Input, Layout, Row} from "antd";
import { LogoLink } from "../../components/AppBar";
import { textContent } from "./textContent";
const { Content } = Layout;


export const PreLaunchView = () => {
  const [email, setEmail] = useState("")

  return (
    <Layout id={'pre-launch-layout'}>
      <Layout id={'width-layout'}>
        <Content
          className={"pre-main-content"}
        >
          <div className={"upper-content"}>
            <div className={"logo"}>
              <LogoLink />
            </div>
            <div className={"pre-title"}>
              {textContent.mainTitle}
            </div>
            <div className={"pre-context"}>
              {textContent.titleDescription}
            </div>
            <div className={"pre-input"}>
              <Input value={email} placeholder={"Email"} onChange={(val) => setEmail(val.target.value)} />
              <Button className={"secondary-btn sign-up"}>Sign Up</Button>
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
      </Layout>
    </Layout>
  );
}