import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic';
import { NextPageContext } from 'next';
import Head from 'next/head';
import { Storefront } from '@oyster/common';
import { getStorefront } from './../actions/getStorefront';

const CreateReactAppEntryPoint = dynamic(() => import('../App'), {
  ssr: false,
});

interface AppProps {
  storefront: Storefront;
}

export async function getServerSideProps(context: NextPageContext) {
  const headers = context?.req?.headers || {};
  let forwarded = headers.forwarded?.split(';').reduce((acc: any, entry) => {
    const [key, value] = entry.split('=');
    acc[key] = value;

    return acc;
  }, {});
  const host = (forwarded?.host || headers.host) as string;
  let subdomain = host.split(':')[0].split('.')[0];

  if (process.env.SUBDOMAIN) {
    subdomain = process.env.SUBDOMAIN
  }

  const storefront = await getStorefront(subdomain);

  if (storefront) {
    return { props: { storefront } };
  }

  return {
    notFound: true,
  };
}

function App({ storefront }: AppProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [hasLogo, setHasLogo] = useState(false);
  const [hasStylesheet, setHasStylesheet] = useState(false);

  useEffect(() => {
    if (hasLogo && hasStylesheet) {
      setIsMounted(true);
    }
  }, [hasLogo, hasStylesheet]);

  useEffect(() => {
    const head = document.head;
    const link = document.createElement('link');

    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = storefront.theme.stylesheet;
    // link.href = 'http://localhost:3000/demo-theme.css'

    link.onload = () => {
      setHasStylesheet(true);
    };

    head.appendChild(link);
  }, []);

  useEffect(() => {
    const onHasLogo = () => {
      setHasLogo(true);
    };

    if (!storefront.theme.logo) {
      onHasLogo();
      return;
    }

    const logo = new Image();
    logo.src = storefront.theme.logo;

    logo.onload = onHasLogo;
    logo.onerror = onHasLogo;
  }, []);

  return (
    <>
      <Head>
        {storefront.meta.favicon && (
          <>
            <link rel="icon" type="image/png" href={storefront.meta.favicon} />
          </>
        )}
        <meta name="description" content={storefront.meta.description} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={storefront.theme.logo} />
        <meta property="og:title" content={storefront.meta.title} />
        <meta property="og:description" content={storefront.meta.description} />
        <title>{storefront.meta.title}</title>
      </Head>
      {isMounted && <CreateReactAppEntryPoint storefront={storefront} />}
    </>
  );
}

export default App;
