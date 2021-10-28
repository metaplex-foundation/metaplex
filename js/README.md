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

## Graphql caching server
There are two modes of using GraphQL Caching Server.
- with memory adapter
- with MongoDB adapter

The server can fill all memory of nodejs process, and it's recommended to increase heap memory with `--max-old-space-size=8192` flag.

To run in `memory` mode:
```sh
ENTRY=memory-server-ingester node --max-old-space-size=8192 dist/bin/metaplex.js
```
or
```sh
node --max-old-space-size=8192 dist/bin/memory-server-ingester.js
```

To run in `mongo` mode:
You have to start mongo instance. For local development to run this command will be enough.
```sh
mongod
```
Also we need to start the process that fill the database with data.
```sh
ENTRY=mongo-ingester --max-old-space-size=8192 node dist/bin/metaplex.js
```
or
```sh
node --max-old-space-size=8192 dist/bin/mongo-ingester.js
```

And our graphql-server is started with
```sh
ENTRY=mongo-server --max-old-space-size=8192 node dist/bin/metaplex.js
```
or
```sh
node --max-old-space-size=8192 dist/bin/mongo-server.js
```

Environmental variables
- ENTRY - (`mongo-server`, `mongo-ingester`, `memory-server-ingester`, `generate`) starting the application with different roles using one entry point
- PORT - (default: `4000`) - port for graphql server
- MONGO_DB - using only for `mongo` mode. The connection string to MongoDB
- NETWORK - (`devnet`, `testnet`, `mainnet-beta`) by default app caches all networks, but we can specify only one.

### Run graphql service in docker in mongo 'mode'
```
docker-compose -f docker-compose.yml up -d
```
It will start 3 services
- mongo: the instance of MongoDB for caching layer
- ingester: the process which fills Database layer
- server: graphql server, which is available at http://localhost:4000/
