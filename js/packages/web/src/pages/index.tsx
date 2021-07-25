import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { NextPageContext } from 'next'
import Head from 'next/head'
import { Storefront } from './../models/storefront'
import { getStorefront } from './../actions/getStorefront'

const CreateReactAppEntryPoint = dynamic(() => import('../App'), {
  ssr: false,
});

interface AppProps {
  storefront: Storefront;
}

export async function getServerSideProps(context: NextPageContext) {
  const subdomain = context?.req?.headers?.host?.split(":")[0].split(".")[0] as string

  const storefront = await getStorefront(subdomain)

  if (storefront) {
    return { props: { storefront } }
  }

  return {
    notFound: true,
  }
}

function App({ storefront }: AppProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true)
  })

  return <>
    <Head>
      {storefront.favicon && (
        <>
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href={storefront.favicon}
          />
          <link
            rel="icon"
            type="image/png"
            sizes="96x96"
            href={storefront.favicon}

          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href={storefront.favicon}
          />
        </>
      )}
      <meta name="description" content={storefront.meta.description} />

      <title>{storefront.meta.title}</title>
    </Head>
    {isMounted && (<CreateReactAppEntryPoint storefront={storefront} />)}
    <link
      rel="stylesheet"
      href={storefront.stylesheet}
    />
  </>
}

export default App;
