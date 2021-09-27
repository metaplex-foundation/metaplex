import React from 'react';
import { Modal } from 'antd';

export const MetaplexModal = (props: any) => {
  const { children, bodyStyle, ...rest } = props;

  return (
    <Modal
      bodyStyle={{
        background: '#2F2F2F',
        boxShadow: '0px 20px 12px 8px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',

        ...bodyStyle,
      }}
      className={'modal-box small-modal'}
      footer={null}
      width={500}
      {...rest}
    >
      {children}
    </Modal>
  );
};
