import React from 'react';
import { Button } from 'antd';

const OpenPackButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className="open-pack">
      <div className="open-pack__title">Once opened, the pack cannot be re-sealed.</div>
      <Button onClick={onClick}>
        Open Pack
      </Button>
    </div>
  )
};

export default OpenPackButton;
