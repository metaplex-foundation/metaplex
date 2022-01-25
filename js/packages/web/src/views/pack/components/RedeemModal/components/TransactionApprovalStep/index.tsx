import React from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';

interface IPropsTransactionApprovalStep {
  goBack: () => void;
}

const transactions = [
  'Opening your Pack.',
  'Begin adding new Cards to your wallet.',
];

const TransactionApprovalStep = ({ goBack }: IPropsTransactionApprovalStep) => (
  <div>
    <div className="modal-redeem__title-container">
      <ArrowLeftOutlined onClick={goBack} className="arrow-back" />
      <span className="text">Wallet Transaction Approvals</span>
    </div>
    <div className="modal-redeem__body">
      <span className="body-big-title">Safe and secure.</span>
      <span className="body-big-desc">
        Your wallet will ask you to approve two transactions.
      </span>
      <div className="transaction-cards">
        {transactions.map((item, idx) => (
          <div className="transaction-card" key={item}>
            <div className="number-frame">{idx + 1}</div>
            <div className="transaction-desc">{item}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default TransactionApprovalStep;
