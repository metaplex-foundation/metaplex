import React, { ReactNode } from 'react';
import { Modal } from 'antd';

export const MetaplexOverlay = (
  props: { modalRender?: undefined; children: ReactNode } & Parameters<
    typeof Modal
  >[0],
) => {
  const { children, ...rest } = props;

  const content = <div className="metaplex-overlay-content">{children}</div>;

  return (
    <Modal
      {...rest}
      centered
      modalRender={() => content}
      mask={false}
      wrapClassName="metaplex-overlay-modal"
    ></Modal>
  );
};
