const withPlugins = require('next-compose-plugins');
const withLess = require('next-with-less');
const isProd = process.env.NODE_ENV === 'production';

const assetPrefix = '';

const plugins = [
  [
    withLess,
    {
      lessLoaderOptions: {
        lessOptions: {
          modifyVars: {
            '@primary-color': '#0a8000',
            '@text-color': 'rgba(255, 255, 255)',
            '@assetPrefix': assetPrefix,
          },
          javascriptEnabled: true,
        },
      },
    },
  ],
];

module.exports = withPlugins(plugins, {
  assetPrefix,
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_STORE_OWNER_ADDRESS:
      process.env.STORE_OWNER_ADDRESS ||
      process.env.REACT_APP_STORE_OWNER_ADDRESS_ADDRESS,
    NEXT_PUBLIC_STORE_ADDRESS: process.env.STORE_ADDRESS,
    NEXT_PUBLIC_BIG_STORE: process.env.REACT_APP_BIG_STORE,
    NEXT_PUBLIC_CLIENT_ID: process.env.REACT_APP_CLIENT_ID,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback.fs = false;
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/:any*',
        destination: '/',
      },
    ];
  },
});
