import React from 'react';
import { Modal } from 'antd';

export const MetaplexModal = (props: any) => {
  const { children, bodyStyle, ...rest } = props;

  return (
    <Modal
      bodyStyle={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        ...bodyStyle,
      }}
      footer={null}
      width={400}
      {...rest}
    >
      {children}
    </Modal>
  );
};
