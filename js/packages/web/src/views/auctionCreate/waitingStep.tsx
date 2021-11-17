import { Space, Card, Steps } from 'antd';
import React, { useEffect, useState } from 'react';
import { LoadingOutlined } from '@ant-design/icons';

const { Step } = Steps;

export const WaitingStep = (props: {
  createAuction: () => Promise<void>;
  confirm: () => void;
  step: number;
}) => {
  const setIconForStep = (currentStep: number, componentStep: number) => {
    if (currentStep === componentStep) {
      return <LoadingOutlined />;
    }
    return null;
  };

  useEffect(() => {
    const func = async () => {
      await props.createAuction();
      props.confirm();
    };
    func();
  }, []);

  return (
    <Space className="metaplex-fullwidth" direction="vertical" align="center">
      <Card>
        <Steps direction="vertical" current={props.step}>
          <Step
            title="Creating the Vault"
            icon={setIconForStep(props.step, 0)}
          />
          <Step
            title="Adding NFT to the Vault"
            icon={setIconForStep(props.step, 1)}
          />
          <Step
            title="Closing the Vault"
            icon={setIconForStep(props.step, 2)}
          />
          <Step
            title="Initializing the Listing"
            icon={setIconForStep(props.step, 3)}
          />
          <Step
            title="Creating the Auctioneer"
            icon={setIconForStep(props.step, 4)}
          />
          <Step
            title="Giving Authority to the Auctioneer"
            icon={setIconForStep(props.step, 5)}
          />
          <Step
            title="Validating the Safety Deposit Boxes"
            icon={setIconForStep(props.step, 6)}
          />
          <Step
            title="Starting the Listing"
            icon={setIconForStep(props.step, 7)}
          />
          <Step
            title="Caching the Listing"
            icon={setIconForStep(props.step, 8)}
          />
        </Steps>
      </Card>
    </Space>
  );
};
