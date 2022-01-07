import React from 'react';
import { Button, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

interface ITransactionErrorModal {
  error: string;
  open: boolean;
  modalView?: boolean;
  onDismiss: () => void;
}

const TransactionErrorModal = ({
  error = '',
  onDismiss,
  open,
  modalView = true,
}: ITransactionErrorModal) => {
  const modalBody = (
    <div className="error-modal-content">
      <div className="warning-icon">
        <ExclamationCircleOutlined width={20} height={20} />
      </div>
      <h4>Transaction error</h4>
      <div className="error-text">
        Your transaction was not completed for{' '}
        {error ? error : 'an unknown reason. Please try again.'}
      </div>
      <Button onClick={onDismiss}>Dismiss</Button>
    </div>
  );
  if (modalView) {
    return (
      <Modal
        className="transaction-error-modal"
        centered
        width={500}
        mask={false}
        visible={open}
        onCancel={onDismiss}
        footer={null}
        closable
      >
        {modalBody}
      </Modal>
    );
  }
  return <div className="create-error-modal">{modalBody}</div>;
};

export default TransactionErrorModal;
