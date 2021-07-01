import { Storefront } from '@holaplex/storefront';
import React, { useEffect, useState } from 'react';
import { fetchStorefront } from '../utils/ids';

interface StorefrontConfig {
  storefront: Storefront | void;
}

export const StorefrontContext = React.createContext<StorefrontConfig>({
  storefront: undefined,
});

export function StorefrontProvider({ children = undefined as any }) {
  const [storefront, setStorefront] = useState(undefined);

  useEffect(() => {
    const subdomain = window.location.hostname.split('.')[0];

    fetchStorefront(subdomain).then(storefront => {
      const head = document.head;
      const link = document.createElement('link');

      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.href = storefront.themeUrl;

      head.appendChild(link);

      link.onload = () => {
        setStorefront(storefront);
      };
    });
  }, []);

  return storefront ? (
    <StorefrontContext.Provider
      value={{
        storefront,
      }}
    >
      {children}
    </StorefrontContext.Provider>
  ) : (
    <div />
  );
}
