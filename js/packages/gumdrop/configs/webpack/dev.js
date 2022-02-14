// development config
const { merge } = require("webpack-merge");
const commonConfig = require("./common");

module.exports = merge(commonConfig, {
  mode: "development",
  entry: [
    "react-hot-loader/patch", // activate HMR for React
    "webpack-dev-server/client?http://localhost:8080", // bundle the client for webpack-dev-server and connect to the provided endpoint
    "./index.tsx", // the entry point of our app
  ],
  devServer: {
    hot: true, // enable HMR on the server
    historyApiFallback: {
      disableDotRule: true,
      index: '/',
      // true, // fixes error 404-ish errors when using react router :see this SO question: https://stackoverflow.com/questions/43209666/react-router-v4-cannot-get-url 
    },
  },
  devtool: "cheap-module-source-map",
  plugins: [],
});
