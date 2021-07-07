import { Storefront } from '@holaplex/storefront';
import React, { useEffect, useState } from 'react';

interface StorefrontConfig {
  storefront: Storefront | void;
}

export const StorefrontContext = React.createContext<StorefrontConfig>({
  storefront: undefined,
});

export function StorefrontProvider({ children = undefined as any }) {
  const [storefront, setStorefront] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_ARWEAVE_URL}/graphql`, 
      { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        query: `
            query GetStorefrontTheme($subdomain: String!) {
              transactions(tags:[{ name: "holaplex:metadata:subdomain", values: [$subdomain]}], sort: HEIGHT_ASC, first: 1) {
                edges {
                  node {
                    id
                    tags {
                      name
                      value
                    }
                  }
                }
              }
            }
          `,
          variables: {
            subdomain: window.location.hostname.split(".")[0],
          },
        })
      }
    )
    .then(res => res.json())
    .then(json => {
      const transaction = json.data.transactions.edges[0]?.node
      
      if (!transaction) {
        setLoading(false)
        return
      }

      const head = document.head;
      const link = document.createElement('link');

      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.href = `${process.env.REACT_APP_ARWEAVE_URL}/${transaction.id}`;

      head.appendChild(link)
      const pubkey = transaction.tags.find(tag => tag.name === "solana:pubkey").value

      link.onload = () => {
        setStorefront({ pubkey })
        setLoading(false)
      }
    })
  }, []);

  if (loading) {
    return <div />
  }

  if (storefront) {
    return (
      <StorefrontContext.Provider
      value={{
        storefront,
      }}
    >
      {children}
    </StorefrontContext.Provider> 
    )
  } else {
    return <div className="not-found">Claim this storefront on <a href="https://holaplex.com">Holaplex</a>.</div>
  }
}
