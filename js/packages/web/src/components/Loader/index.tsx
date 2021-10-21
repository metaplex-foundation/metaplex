import { useMeta } from '@oyster/common';
import React, { FC } from 'react';

export const LoaderProvider: FC = ({ children }) => {
  const { isLoading } = useMeta();

  return (
    <>
      <div>
        <div>loading</div>
        <Spinner />
      </div>
      {children}
    </>
  );
};

export const Spinner = () => {
  return <div />;
};
