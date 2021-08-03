import type { AppProps } from 'next/app';
import Head from 'next/head';

import '../styles.less';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Metaplex NFT Marketplace</title>
      </Head>
      {typeof window === 'undefined' ? null : <Component {...pageProps} />}
    </>
  );
}
