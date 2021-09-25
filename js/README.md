## Setup

Be sure to be running Node v14.17.6 and yarn version 1.22.10.

`yarn bootstrap`

Then run:

`yarn start`

You may have to rebuild your package more than one time to secure a
running environment.

## Known Issues

### Can't find CSS files in common

Common currently uses a less library to compile down less files into css in both the src directory for the TS server
in vscode to pick up and in the dist folder for importers like lending and proposal projects to pick up. If you do not see these files appear when running the `npm start lending` or other commands, and you see missing CSS errors,
you likely did not install the packages for common correctly. Try running:

`lerna exec npm install --scope @oyster/common` to specifically install packages for common.

Then, test that css transpiling is working:

`lerna exec npm watch-css-src --scope @oyster/common` and verify css files appear next to their less counterparts in src.

## ⚠️ Warning

Any content produced by Solana, or developer resources that Solana provides, are for educational and inspiration purposes only. Solana does not encourage, induce or sanction the deployment of any such applications in violation of applicable laws or regulations.

