import { LoadingOutlined } from '@ant-design/icons';
import { Card, Steps, Space } from 'antd';
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
      <Card>
        <Steps direction="vertical" current={props.step}>
          <Step
            title="Uploading Assets"
            description="Starting Mint Process"
            icon={setIconForStep(props.step, 0)}
          />
          <Step
            title="Uploading Metadata"
            icon={setIconForStep(props.step, 1)}
          />
          <Step
            title="Approving Transaction"
            description="Approve the transaction from your wallet"
            icon={setIconForStep(props.step, 2)}
          />
          <Step
            title="Sending Transaction to Solana"
            description="This will take a few seconds."
            icon={setIconForStep(props.step, 3)}
          />
          <Step
            title="Waiting for Final Confirmation"
            icon={setIconForStep(props.step, 4)}
          />
        </Steps>
      </Card>
    </Space>
  );
};
