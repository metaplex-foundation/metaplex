import React from 'react';
import { Button } from 'antd';
import { usePack } from '../../contexts/PackContext';

const OpenPackButton = ({ onClick }: { onClick: () => void }) => {
  const { provingProcess } = usePack();
  return (
    <div className="open-pack">
      <div className="open-pack__title">
        Once opened a Pack cannot be resealed
      </div>
      <Button onClick={onClick}>
        {provingProcess ? 'Resume Opening Pack' : 'Open Pack'}
      </Button>
    </div>
  );
};

export default OpenPackButton;
