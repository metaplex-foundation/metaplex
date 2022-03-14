import type { AppProps } from 'next/app'
import Head from 'next/head'
import React from 'react'

import '../styles/index.less'
import 'remixicon/fonts/remixicon.css'
import '../styles/globals.less'
import '../styles/overrides.less'
import '../styles/custom-form.scss'

import 'swiper/css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <title>Karmaverse NFT Marketplace</title>
        <meta name='viewport' content='width=device-width, initial-scale=1, maximum-scale=1' />
      </Head>
      <div id='root'>
        <Component {...pageProps} />
      </div>
    </>
  )
}
