import React from 'react-dom';
import { memo } from 'react';
import { Steps, Button } from 'antd';
import { useMeta } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';

import useWindowDimensions from '../../../../utils/layout';
import { CreatePackSteps } from '../../types';

import { STEPS_TITLES, CONTINUE_TITLES } from './data';
import { SidebarProps } from './interface';

const { Step } = Steps;

const Sidebar = ({ step, setStep, submit, isValidStep }: SidebarProps) => {
  const { connected } = useWallet();
  const { isLoading } = useMeta();
  const { width } = useWindowDimensions();

  const isFinalStep = step === CreatePackSteps.ReviewAndMint;
  const shouldDisable = !isValidStep || !connected || isLoading;

  const handleContinue = (): void => {
    if (isFinalStep) {
      return submit();
    }

    setStep(step + 1);
  };

  return (
    <div className="sidebar-wrapper">
      <Steps
        className="sidebar-steps"
        direction={width < 768 ? 'horizontal' : 'vertical'}
        current={step}
      >
        {Object.entries(STEPS_TITLES).map(([step, title]) => (
          <Step title={title} key={step} />
        ))}
      </Steps>

      <Button
        className="sidebar-btn secondary-btn"
        onClick={handleContinue}
        disabled={shouldDisable}
      >
        {CONTINUE_TITLES[step]}
      </Button>

      {step !== CreatePackSteps.SelectItems && (
        <Button
          type="text"
          className="sidebar-btn"
          onClick={() => setStep(step - 1)}
        >
          Back
        </Button>
      )}
    </div>
  );
};

export default memo(Sidebar);
