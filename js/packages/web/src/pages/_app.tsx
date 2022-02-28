import type { AppProps } from 'next/app';
import Head from 'next/head';
import React, { useEffect } from 'react';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@lingui/core';
import { remoteLoader } from '@lingui/remote-loader';
import { useRouter } from 'next/router';
import * as plurals from 'make-plural/plurals';

import '../styles/index.less';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { locale } = router;

  useEffect(() => {
    // @ts-ignore TYPE NEEDS FIXING
    async function load(locale) {
      // @ts-ignore TYPE NEEDS FIXING
      i18n.loadLocaleData(locale, { plurals: plurals[locale.split('_')[0]] });

      try {
        const remoteMessages = import(`../../locale/${locale}.json`);

        const messages = remoteLoader({
          messages: remoteMessages,
          format: 'minimal',
        });
        i18n.load(locale, messages);
      } catch {
        // Load fallback messages
        const { messages } = await import(
          `@lingui/loader!./../../locale/${locale}.json?raw-lingui`
        );
        i18n.load(locale, messages);
      }

      i18n.activate(locale);
    }

    load(locale);
  }, [locale]);

  return (
    <I18nProvider i18n={i18n}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Metaplex NFT Marketplace</title>
      </Head>
      <div id="root">
        <Component {...pageProps} />
      </div>
    </I18nProvider>
  );
}
