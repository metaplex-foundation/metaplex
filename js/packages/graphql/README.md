# GraphQL api server

It's a cache server, which receives all the Mataplex data from the blockchain and keeps it, and gives data through GraphQL interface in a convenient form, based on the Metaplex data usage

## Requirements

The server currently requires at least 8GB of RAM.


## Run In-memory solution

```
yarn build
yarn start
```

it will start GraphQL at `http://localhost:4000/`

## Generate GraphQL schema:

```
yarn generate:schema
```
## Run with mongo

```
yarn build
yarn start:mongo:ingester
```

it will start ingester which will start to receive data from the blockchain and put it into MongoDB

```
yarn build
yarn start:mongo:server
```

it will start GraphQL at `http://localhost:4000/` which will read data from MongoDB

## Overview
There are two modes of using GraphQL Caching Server.
- with memory adapter
- with MongoDB adapter

The server can fill all memory of nodejs process, and it's recommended to increase heap memory with `--max-old-space-size=8192` flag.

To run in `memory` mode:
```sh
yarn start:memory
```

To run in `mongo` mode:
```
┌──────────┐    ┌─────────┐    ┌────────────────┐
│ ingester │--->│ MongoDB │<---│ GraphQL server │
└──────────┘    └─────────┘    └────────────────┘
     │        ┌───────────────────────┐     │
     └────────│ Metaplex/Solana data  │─────┘
              │ over http / websocket │
              └───────────────────────┘
```

You have to start mongo instance. For local development to run this command will be enough.
```sh
mongod
```
Also we need to start the process that fill the database with data.
```sh
yarn start:mongo:ingester
```

And our graphql-server is started with
```sh
yarn start:mongo:server
```

Environmental variables
- ENTRY - (`mongo-server`, `mongo-ingester`, `memory-server-ingester`, `generate`) starting the application with different roles using one entry point
- PORT - (default: `4000`) - port for graphql server
- MONGO_DB - using only for `mongo` mode. The connection string to MongoDB
- NETWORK - (`devnet`, `testnet`, `mainnet-beta`) by default app caches all networks, but we can specify one of them to use.

### Run graphql service in docker in mongo 'mode'
```
docker-compose -f docker-compose.yml up -d
```
It will start 3 services
- mongo: the instance of MongoDB for caching layer
- ingester: the process which fills Database layer
- server: graphql server, which is available at http://localhost:4000/

### Add other adapters
For creating new adapter you need only implement interface
```
IDataAdapter<
  TWriter extends IWriter,
  TReader extends IReader,
>
```

Where `IDataAdapter` initializes and add access to `TWriter` which implements `IWriter` and `TReader` which imlements `IReader`.
For inspiration see `js/packages/graphql/src/adapters/mongo` folder.
