import React, { ReactElement } from 'react';
import { Button } from 'antd';

import { MetaplexOverlay } from '@oyster/common';

import { Confetti } from '../../../../components/Confetti';

const SuccessModal = ({
  shouldShow,
  hide,
}: {
  shouldShow: boolean;
  hide: () => void;
}): ReactElement => {
  return (
    <MetaplexOverlay visible={shouldShow}>
      <Confetti />
      <h1
        className="title"
        style={{
          fontSize: '3rem',
          marginBottom: 20,
        }}
      >
        Congratulations
      </h1>
      <p
        style={{
          color: 'white',
          textAlign: 'center',
          fontSize: '2rem',
        }}
      >
        Your pack has been created.
      </p>
      <Button className="sidebar-btn secondary-btn" onClick={hide}>
        Continue
      </Button>
    </MetaplexOverlay>
  );
};

export default SuccessModal;
