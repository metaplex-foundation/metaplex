import { LoadingOutlined } from '@ant-design/icons';
import { Card, Spin, Steps, Space } from 'antd';
import React, { useEffect } from 'react';

const { Step } = Steps;

export const WaitingStep = (props: {
  mint: Function;
  minting: boolean;
  confirm: Function;
  step: number;
}) => {
  useEffect(() => {
    const func = async () => {
      await props.mint();
      props.confirm();
    };
    func();
  }, []);

  const setIconForStep = (currentStep: number, componentStep: number) => {
    if (currentStep === componentStep) {
      return <LoadingOutlined />;
    }
    return null;
  };

  return (
    <Space className="metaplex-fullwidth" direction="vertical" align="center">
      <Spin size="large" />
      <Card>
        <Steps direction="vertical" current={props.step}>
          <Step
            title="Minting"
            description="Starting Mint Process"
            icon={setIconForStep(props.step, 0)}
          />
          <Step title="Preparing Assets" icon={setIconForStep(props.step, 1)} />
          <Step
            title="Signing Metadata Transaction"
            description="Approve the transaction from your wallet"
            icon={setIconForStep(props.step, 2)}
          />
          <Step
            title="Sending Transaction to Solana"
            description="This will take a few seconds."
            icon={setIconForStep(props.step, 3)}
          />
          <Step
            title="Waiting for Initial Confirmation"
            icon={setIconForStep(props.step, 4)}
          />
          <Step
            title="Waiting for Final Confirmation"
            icon={setIconForStep(props.step, 5)}
          />
          <Step
            title="Uploading to Arweave"
            icon={setIconForStep(props.step, 6)}
          />
          <Step
            title="Updating Metadata"
            icon={setIconForStep(props.step, 7)}
          />
          <Step
            title="Signing Token Transaction"
            description="Approve the final transaction from your wallet"
            icon={setIconForStep(props.step, 8)}
          />
        </Steps>
      </Card>
    </Space>
  );
};
