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
          setStorefront(storefront)
        });
      }, [window.location.hostname]);

    return (
        <StorefrontContext.Provider
            value={{
                storefront
            }}
        >
            {children}
        </StorefrontContext.Provider>
    )
}