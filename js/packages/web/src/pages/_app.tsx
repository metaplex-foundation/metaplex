import type { AppProps } from 'next/app';
import Head from 'next/head';

import '../styles/index.less';

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div id="root">
        <Component {...pageProps} />
      </div>
    </>
  );
}

export default App