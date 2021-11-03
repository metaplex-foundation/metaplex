import React from 'react';
import { Modal } from 'antd';

export const MetaplexModal = (props: any) => {
  const { children, bodyStyle, ...rest } = props;

  return (
    <Modal
      className="connect-modal"
      bodyStyle={{
        boxShadow: '0px 6px 12px 8px rgba(0, 0, 0, 0.3)',
        background: "linear-gradient(269.59deg, #1F2231 -8.58%, #1C4656 48.49%, #1F2231 97.08%) !important",
        borderRadius: 5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        ...bodyStyle,
      }}
      footer={null}
      width={600}
      height={600}
      {...rest}
    >
      {children}
    </Modal>
  );
};
