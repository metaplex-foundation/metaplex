# Art Batch Create

This screen can be used to do mint batch of NFTs simulteniously.

## Prepare:

1. You need to have NFT images to be placed within `js/packages/web/public/art-collection/` with the name in form of `[index].png`.

2. You will need to have CSV file in form similar to
`js/packages/web/public/art-collection/data.csv`, with first column index of the item and other attributes will be used for each item. The index will be used in the name of NFT `Name #[index]` and to pick proper image from the `/art-collection` folder.

3. Update `js/packages/web/src/views/artCreateBatch/index.tsx`, line 20 & 40 with default values for attributes, like `name #000`, `site url`, `item description` (same for all items), `seller fee`, etc.

## Details to mention

- Active wallet address will be used as creator address.
- Minting with more than 15 threads may fail because of RPC server rate limit.
-
- In the end of minting you will be able to download JSON file with following structure:
```
[index_in_set]: [token.mintKey, token.associatedTokenAddress]
```
which can be used for automated distribution for these items.
In case of failed mint the field have a look like this:
```
[index_in_set]: [null, null]
```
so you will know what field has been failed.

## Important Note

If you consider to use this screen, then please test it multiply times on `devnet` with different set of the items before trying it on `mainnet` and before you spend real money!
