import React from 'react';
import { Button } from 'antd';
import { LABELS } from '../../constants';
import { Link } from 'react-router-dom';
import './style.css';

export const ActionConfirmation = (props: {
  className?: string;
  onClose: () => void;
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-around',
        alignItems: 'center',
      }}
    >
      <h2>Congratulations!</h2>
      <div>Your action has been successfully executed</div>
      <div className="success-icon" />
      <Link to="/dashboard">
        <Button type="primary">{LABELS.DASHBOARD_ACTION}</Button>
      </Link>
      <Button type="text" onClick={props.onClose}>
        {LABELS.GO_BACK_ACTION}
      </Button>
    </div>
  );
};
