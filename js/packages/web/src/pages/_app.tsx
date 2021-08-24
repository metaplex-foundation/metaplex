import type { AppProps } from 'next/app';
import Head from 'next/head';

import '../styles/index.less';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Apeshit Social Club - NFT Marketplace</title>


        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="twitter:site" content="@ApeShitSocial"/>
        <meta name="twitter:creator" content="@ApeShitSocial"/>
        <meta property="og:site_name" content="ApeShit Social Club"/>
        <meta name="twitter:image" content="https://apeshit.social/outline.jpg"/>
        <meta name="twitter:image:alt" content="Apes, NFTs, charity, social club. Built on @solana"/>
        <meta name="twitter:title" content="ApeShit Social Club"/>
        <meta name="twitter:description" content="Apes, NFTs, charity, social club. Built on @solana"/>
        <meta name="og:url" content="https://apeshit.social"/>
        <meta name="og:title" content="ApeShit Social Club"/>
        <meta name="og:image" content="https://apeshit.social/outline.jpg"/>
        <meta property="og:description" content="Apes, NFTs, charity, social club. Built on @solana"/>

        <link rel="preconnect" href="https://fonts.gstatic.com"/>

        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <meta name="description" content="ApeShit Social Club" />
      </Head>
      <div id="root">
        <Component {...pageProps} />
      </div>
    </>
  );
}
