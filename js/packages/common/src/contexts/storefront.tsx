import { Storefront, StorefrontConfig, ArweaveTag } from '@holaplex/storefront';
import React, { useEffect, useState } from 'react';

const ARWEAVE_URL = process.env.NEXT_PUBLIC_ARWEAVE_URL;

export const StorefrontContext = React.createContext<StorefrontConfig>({
  storefront: undefined,
});

interface StorefrontProviderChildProps {
  storefront: Storefront
}

interface StorefrontProviderProps {
  children: (props: StorefrontProviderChildProps) => any
}
export function StorefrontProvider({ children }: StorefrontProviderProps) {
  const [storefront, setStorefront] = useState<Storefront>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${ARWEAVE_URL}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
            query GetStorefrontTheme($subdomain: String!) {
              transactions(tags:[{ name: "holaplex:metadata:subdomain", values: [$subdomain]}], first: 1) {
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
          subdomain: window.location.hostname.split('.')[0],
        },
      }),
    })
      .then(res => res.json())
      .then(json => {
        const transaction = json.data.transactions.edges[0]?.node;

        if (!transaction) {
          setLoading(false);
          return;
        }
        const pubkey = transaction.tags.find(
          (tag: ArweaveTag) => tag.name === 'solana:pubkey',
        ).value;

        const logoURL = transaction.tags.find(
          (tag: ArweaveTag) => tag.name === 'holaplex:theme:logo:url',
        )?.value;

        const onLoadStylesheet = () => {
          const head = document.head;
          const link = document.createElement('link');
  
          link.type = 'text/css';
          link.rel = 'stylesheet';
          link.href = `${ARWEAVE_URL}/${transaction.id}`;
          // link.href = 'http://localhost:3000/demo-theme.css'

          link.onload = () => {
            setStorefront({ pubkey });
            setLoading(false);
          }
  
          head.appendChild(link);
        }
        if (logoURL) {
          const logo = new Image()
          logo.src = logoURL
          
          logo.onload = onLoadStylesheet
          logo.onerror = onLoadStylesheet
        } else {
          onLoadStylesheet()
        }
      });
  }, []);


  if (loading) {
    return <div />;
  }

  if (storefront) {
    return (
      <StorefrontContext.Provider
        value={{
          storefront,
        }}
      >
        {children({ storefront })}
      </StorefrontContext.Provider>
    );
  } else {
    return (
      <h1 className="not-found">
        Claim this storefront on <a href="https://holaplex.com">Holaplex</a>.
      </h1>
    );
  }
}
