import React, { ReactNode } from 'react';
import { Modal } from 'antd';

export const MetaplexOverlay = (
  props: { modalRender?: undefined; children: ReactNode } & Parameters<
    typeof Modal
  >[0],
) => {
  const { children, ...rest } = props;

  const content = <div>{children}</div>;

  return (
    <Modal
      {...rest}
      centered
      modalRender={() => content}
      width={'100vw'}
      mask={false}
    ></Modal>
  );
};
