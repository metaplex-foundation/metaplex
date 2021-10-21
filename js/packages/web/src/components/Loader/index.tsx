import { useMeta } from '@oyster/common';
import React, { FC, useMemo } from 'react';

export const LoaderProvider: FC = ({ children }) => {
  const { isLoading } = useMeta();

  return (
    <>
      <div id="metaplex-loading" className={isLoading ? 'loading' : undefined}>
        <div id="metaplex-loading-text">loading</div>
        <Spinner />
      </div>
      {children}
    </>
  );
};

export const Spinner = () => {
  const bars = useMemo(
    () =>
      new Array(9)
        .fill(undefined)
        .map((_, i) => (
          <div key={i} className={`metaplex-loading-spinner-bar-${i}`} />
        )),
    [],
  );

  return <div id="metaplex-loading-spinner">{bars}</div>;
};
