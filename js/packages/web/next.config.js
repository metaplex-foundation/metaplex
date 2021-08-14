const withPlugins = require('next-compose-plugins');
const withLess = require('next-with-less');

const assetPrefix = process.env.ASSET_PREFIX || '';

const plugins = [
  [
    withLess,
    {
      lessLoaderOptions: {
        lessOptions: {
          modifyVars: {
            '@primary-color': '#768BF9',
            '@text-color': 'rgba(255, 255, 255)',
            '@assetPrefix': assetPrefix || "''",
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
  env:{
    NEXT_PUBLIC_STORE_OWNER_ADDRESS_ADDRESS: process.env.REACT_APP_STORE_OWNER_ADDRESS_ADDRESS,
<<<<<<< HEAD
    NEXT_PUBLIC_ARWEAVE_URL: process.env.NEXT_PUBLIC_ARWEAVE_URL
=======
    NEXT_PUBLIC_BIG_STORE: process.env.REACT_APP_BIG_STORE,
>>>>>>> 81023eb3e52c31b605e1dcf2eb1e7425153600cd
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
