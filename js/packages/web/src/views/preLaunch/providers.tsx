import { Storefront, StoreProvider } from '@oyster/common';
import React, { FC } from 'react';
export const Providers: FC<{ storefront: Storefront }> = ({
  children,
  storefront,
}) => {
  return (
    <StoreProvider
      storefront={storefront}
      storeAddress={process.env.NEXT_PUBLIC_STORE_ADDRESS}
    >
      {children}
    </StoreProvider>
  );
};
