import type { AppProps } from 'next/app';
import Head from 'next/head';
import React from 'react';
import '../styles/index.less';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div>
        <Component {...pageProps} />
      </div>
    </>
  );
}
