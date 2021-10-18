import React from 'react';
import { Modal } from 'antd';

export const MetaplexOverlay = (props: any) => {
  const { children, ...rest } = props;

  const content = <div>{children}</div>;

  return (
    <Modal
      centered
      modalRender={() => content}
      width={'100vw'}
      mask={false}
      {...rest}
    ></Modal>
  );
};
