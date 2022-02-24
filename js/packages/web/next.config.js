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
            '@assetPrefix': assetPrefix || "''",
            '@background-color-secondary': 'rgba(255, 255, 255)',
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
  productionBrowserSourceMaps: true,
  env: {
    NEXT_PUBLIC_BUGSNAG_API_KEY: process.env.NEXT_PUBLIC_BUGSNAG_API_KEY,
    NEXT_PUBLIC_STORE_OWNER_ADDRESS:
      process.env.STORE_OWNER_ADDRESS ||
      process.env.REACT_APP_STORE_OWNER_ADDRESS_ADDRESS,
    NEXT_PUBLIC_STORE_ADDRESS: process.env.STORE_ADDRESS,
    NEXT_PUBLIC_ARWEAVE_URL:
      process.env.NEXT_PUBLIC_ARWEAVE_URL || 'https://arweave.net',
    NEXT_PUBLIC_BIG_STORE: process.env.REACT_APP_BIG_STORE,
    NEXT_PUBLIC_CLIENT_ID: process.env.REACT_APP_CLIENT_ID,
    NEXT_PUBLIC_IPFS_CDN:
      process.env.NEXT_PUBLIC_IPFS_CDN || 'https://ipfs.cache.holaplex.com',
    NEXT_PUBLIC_IPFS_IMAGE_CDN:
      process.env.NEXT_PUBLIC_IPFS_IMAGE_CDN || 'https://images.holaplex.com',
  },
  async rewrites() {
    return [
      {
        source: '/:any*',
        destination: '/',
      },
    ];
  },
  webpack: (config, { webpack, buildId, isServer }) => {
    // source https://github.com/vercel/next.js/issues/12944#issuecomment-765857160
    // Actually, Nextjs has a function for generateBuildId, but for some reason it did not get passed to the buildId variable below.
    // Easier to just define it here

    // take a look at this in the morning https://stackoverflow.com/questions/14583282/heroku-display-hash-of-current-commit-in-browser

    const BUILD_ID =
      process.env.SOURCE_VERSION ||
      require('child_process').execSync('git rev-parse HEAD').toString().trim();

    config.plugins.forEach(plugin => {
      if (plugin.constructor.name === 'DefinePlugin') {
        plugin.definitions = {
          ...plugin.definitions,
          'process.env.BUILD_ID': JSON.stringify(BUILD_ID),
        };
      }
    });
    return config;
  },
});
