import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { NextPageContext } from 'next';
import Head from 'next/head';
import { Storefront } from './../models/storefront';
import { getStorefront } from './../actions/getStorefront';

const CreateReactAppEntryPoint = dynamic(() => import('../App'), {
  ssr: false,
});

interface AppProps {
  storefront: Storefront;
}

export async function getServerSideProps(context: NextPageContext) {
  const subdomain = context?.req?.headers?.host
    ?.split(':')[0]
    .split('.')[0] as string;

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
  const [hasStylsheet, setHasStylesheet] = useState(false);

  useEffect(() => {
    if ( hasLogo && hasStylsheet) {
      setIsMounted(true)
    }
  }, [hasLogo, hasStylsheet]);

  useEffect(() => {
    const head = document.head;
    const link = document.createElement('link');

    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = storefront.theme.stylesheet;
    // link.href = 'http://localhost:3000/demo-theme.css'

    link.onload = () => {
      setHasStylesheet(true);

    }

    head.appendChild(link);
  }, [])

  useEffect(() => {
    const onHasLogo = () => {
      setHasLogo(true)
    }

    if (!storefront.theme.logo) {
      onHasLogo()
      return;
    }

    const logo = new Image()
    logo.src = storefront.theme.logo
      
    logo.onload = onHasLogo
    logo.onerror = onHasLogo
  }, [])

  return (
    <>
      <Head>
        {storefront.meta.favicon && (
          <>
            <link
              rel="icon"
              type="image/png"
              sizes="16x16"
              href={storefront.meta.favicon}
            />
          </>
        )}
        <meta name="description" content={storefront.meta.description} />

        <title>
          {storefront.meta.title}
        </title>
      </Head>
      {isMounted && <CreateReactAppEntryPoint storeId={storefront.pubkey} />}
    </>
  );
}

export default App;
