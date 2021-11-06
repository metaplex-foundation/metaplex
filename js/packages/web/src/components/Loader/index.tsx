import { LoadingOutlined } from '@ant-design/icons';
import { useMeta, useStore } from '@oyster/common';
import { Spin } from 'antd';
import React, { FC } from 'react';

export const LoaderProvider: FC = ({ children }) => {
  const { isLoading } = useMeta();
  const { storefront } = useStore();

  return (
    <>
      <div id="metaplex-loading" className={isLoading ? 'loading' : undefined}>
        <img id="metaplex-loading-icon" src={storefront.theme.logo} />
        <div id="metaplex-loading-text">loading</div>
        <Spinner />
      </div>
      {!isLoading && children}
    </>
  );
};

export const Spinner = () => {
  return <Spin indicator={<LoadingOutlined />} />;
};
