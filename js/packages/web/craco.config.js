const CracoLessPlugin = require('craco-less');
const CracoAlias = require('craco-alias');
const CracoBabelLoader = require('craco-babel-loader');
const path = require('path');
const fs = require('fs');
//console.log('qualified', pnp.resolveRequest('@babel/preset-typescript'), path.resolve(__dirname, '/') + 'src/');

// Handle relative paths to sibling packages
const appDirectory = fs.realpathSync(process.cwd());
const resolvePackage = relativePath => path.resolve(appDirectory, relativePath);

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      paths.appBuild = webpackConfig.output.path = path.resolve(
        './../../build/web',
      );
      return webpackConfig;
    },
  },
  plugins: [
    /*{
      plugin: CracoBabelLoader,
      options: {
        includes: [
          // No "unexpected token" error importing components from these lerna siblings:
          resolvePackage('../packages'),
        ],
      },
    },*/
    /*{
      plugin: CracoAlias,
      options: {
        source: 'tsconfig',
        // baseUrl SHOULD be specified
        // plugin does not take it from tsconfig
        baseUrl: '../../',
        // tsConfigPath should point to the file where "baseUrl" and "paths" are specified
        tsConfigPath: '../../tsconfig.json',
      },
    },*/
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            modifyVars: {
              '@primary-color': '#768BF9',
              '@text-color': 'rgba(255, 255, 255)'
            },
            javascriptEnabled: true,
          },
        },
      },
    },
  ],
};
