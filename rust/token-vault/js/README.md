# mpl-token-vault

This package contains the token vault contract SDK code.

## API Docs


Find the [token-vault API docs published
here](https://metaplex-foundation.github.io/metaplex-program-library/docs/token-vault/index.html).

Addiontally the [`./examples`](./examples) do a good job at documenting the SDK API as well as the
[`./tests'`](./tests).

## Developing

In order to update the generated SDK when the rust contract was updated please run:

```
yarn gen:api
```

and then update the wrapper code and tests.

## LICENSE

Apache v2.0
