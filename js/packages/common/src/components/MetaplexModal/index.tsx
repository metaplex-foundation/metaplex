import React from 'react';
import { Modal } from 'antd';

export const MetaplexModal = (props: any) => {
  const { children, bodyStyle, ...rest } = props;

  return (
    <Modal 
    maskStyle={{backgroundColor:'none'}}
      bodyStyle={{
        background: '#2C3249',
        boxShadow: '0px 6px 12px 8px rgba(0, 0, 0, 0.3)',
        borderRadius: 16,
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
