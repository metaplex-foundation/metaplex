import { Progress } from 'antd';
import React, { useEffect, useState } from 'react';

export const WaitingStep = (props: {
  createAuction: () => Promise<void>;
  confirm: () => void;
}) => {
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const func = async () => {
      const inte = setInterval(
        () => setProgress(prog => Math.min(prog + 1, 99)),
        120,
      );
      await props.createAuction();
      clearInterval(inte);
      props.confirm();
    };
    func();
  }, []);

  return (
    <div className="auction-progress-indicator">
      <Progress type="circle" percent={progress} />
      <div>Your creation is being listed with Metaplex...</div>
      <div>This can take up to 90 seconds.</div>
    </div>
  );
};
