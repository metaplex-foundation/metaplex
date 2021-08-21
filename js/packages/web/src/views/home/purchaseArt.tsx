import React from 'react';
import { Button } from 'antd';

export const PurchaseArt = () => {
  const purchase = () => {
    console.log('purchase');
  };

  return (
    <div style={{ margin: 0, marginTop: 30, alignItems: 'center' }}>
      <Button
        type="primary"
        shape="round"
        size="large"
        className="app-btn purchase-btn"
        onClick={purchase}
      >
        Get your thug bird!
      </Button>
    </div>
  );
};
