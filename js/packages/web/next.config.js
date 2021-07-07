const withLess = require('next-with-less');

module.exports = withLess({
  async rewrites() {
    return [
      {
        source: '/:any*',
        destination: '/',
      },
    ];
  },
  lessLoaderOptions: {
    lessOptions: {
      modifyVars: {
        '@primary-color': '#768BF9',
        '@text-color': 'rgba(255, 255, 255)',
      },
      javascriptEnabled: true,
    },
  },
});
