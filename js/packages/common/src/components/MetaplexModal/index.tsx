import React, { ReactNode } from 'react';
import { Modal, ModalProps } from 'antd';

export const MetaplexModal = (
  props: Partial<ModalProps> & {
    children: ReactNode;
  },
) => {
  const { children, ...rest } = props;

  return (
    <Modal footer={null} width={500} {...rest}>
      {children}
    </Modal>
  );
};
