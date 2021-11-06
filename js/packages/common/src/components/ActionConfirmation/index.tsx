import React from 'react';
import { Button } from 'antd';
import { LABELS } from '../../constants';
import { Link } from 'react-router-dom';

export const ActionConfirmation = (props: { onClose: () => void }) => {
  return (
    <div>
      <h2>Congratulations!</h2>
      <div>Your action has been successfully executed</div>
      <Link to="/dashboard">
        <Button type="primary">{LABELS.DASHBOARD_ACTION}</Button>
      </Link>
      <Button type="text" onClick={props.onClose}>
        {LABELS.GO_BACK_ACTION}
      </Button>
    </div>
  );
};
