import React from 'react';
import { Button } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

interface IClaimingError {
  error: string;
  onDismiss: () => void;
}

const ClaimingError = ({ error = '', onDismiss }: IClaimingError) => {
  return (
    <div className="claim-error-modal">
      <div className="claim-error-modal-content">
        <div className="warning-icon">
          <ExclamationCircleOutlined width="20px" height="20px" />
        </div>
        <h4>Transaction error</h4>
        <div className="error-text">
          Your transaction was not completed for{' '}
          {error ? error : 'an unknown reason. Please try again.'}
        </div>
        <Button onClick={onDismiss}>Dismiss</Button>
      </div>
    </div>
  );
};

export default ClaimingError;
