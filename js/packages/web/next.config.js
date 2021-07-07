const withPlugins = require('next-compose-plugins');
const withLess = require('next-with-less');
const nextEnv = require('next-env');
const dotenvLoad = require('dotenv-load');

dotenvLoad();

const plugins = [
  nextEnv({
    publicPrefix: 'REACT_APP_',
  }),
  [
    withLess,
    {
      lessLoaderOptions: {
        lessOptions: {
          modifyVars: {
            '@primary-color': '#768BF9',
            '@text-color': 'rgba(255, 255, 255)',
          },
          javascriptEnabled: true,
        },
      },
    },
  ],
];

module.exports = withPlugins(plugins, {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/:any*',
        destination: '/',
      },
    ];
  },
});
