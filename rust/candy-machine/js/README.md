# mpl-candy-machine
#

This package contains the Candy Machine contract SDK code. This MPL package targets the current generation of candy machine on the v2.0.0 release line.

## Developing

In order to update the generated SDK when the rust contract was updated please run:

```
yarn gen:api
```

NOTE: at this point this only generates the IDL json file but later will generate TypeScript
definitions and SDK code as well, derived from that IDL.

## LICENSE

Apache v2.0
