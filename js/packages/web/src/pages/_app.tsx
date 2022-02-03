import type { AppProps } from 'next/app';
import Head from 'next/head';

import 'remixicon/fonts/remixicon.css';
import '../styles/globals.less';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Karmaverse NFT Marketplace</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </Head>
      <div id="root">
        <Component {...pageProps} />
      </div>
    </>
  );
}
