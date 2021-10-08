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


## Roadmap

- Currently, it uses memory to store all the data, but we working to migrate storing into MongoDB
- GraphQL subscribe mechanizm need to be reviewed
- Simplify the internal data structure and their relationship

