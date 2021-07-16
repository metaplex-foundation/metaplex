import { Storefront, StorefrontConfig, ArweaveTag } from '@holaplex/storefront';
import React, { useEffect, useState } from 'react';

const REACT_APP_ARWEAVE_URL = process.env.REACT_APP_ARWEAVE_URL;

export const StorefrontContext = React.createContext<StorefrontConfig>({
  storefront: undefined,
});

export function StorefrontProvider({ children = undefined as any }) {
  const [storefront, setStorefront] = useState({} as Storefront);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${REACT_APP_ARWEAVE_URL}/graphql`, {
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

        const head = document.head;
        const link = document.createElement('link');

        link.type = 'text/css';
        link.rel = 'stylesheet';
        link.href = `${REACT_APP_ARWEAVE_URL}/${transaction.id}`;

        head.appendChild(link);
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
          link.href = `${REACT_APP_ARWEAVE_URL}/${transaction.id}`;

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

  if (storefront.pubkey) {
    return (
      <StorefrontContext.Provider
        value={{
          storefront,
        }}
      >
        {children}
      </StorefrontContext.Provider>
    );
  } else {
    return (
      <div className="not-found">
        Claim this storefront on <a href="https://holaplex.com">Holaplex</a>.
      </div>
    );
  }
}
