# mpl-fixed-price-sale-cli
## Overview
This CLI utility provide ability to interact with on-chain `mpl-fixed-price-sale` program. Currently CLI has all features and all commands, that are supported by program, but also be updated as the `mpl-fixed-price-sale` is updated.

## Commands
- `Buy`
- `ChangeMarket`
- `ClaimResource`
- `CloseMarket`
- `CreateMarket`
- `CreateStore`
- `InitSellingResource`
- `ResumeMarket`
- `SavePrimaryMetadataCreators`
- `SuspendMarket`
- `Withdraw`
- `GetSellingResource`
- `GetStore`
- `GetMarket`
- `GetTradeHistory`

## Files schema
Few commands require input `.json` files, here we provide schema examples:

- `creators.json`:
```json
[
    {
        "address": "...",
        "share": 30,
    }
]
```

- `gating_config.json`:
```json
{
    "collection": "...",
    "expire_on_use": false,
    "gating_time": null
}
```

## Example
This example demonstrate market creation. Follow step by step (assumed that you compiled executable binary and moved to working directory).

1. First of all we must create store:
    
    `~ $: ./mpl-fixed-price-sale-cli create-store --name example1 --description example2`

2. Next we can initialize selling resource, but before you must create edition mint(and token), this can be done with `mpl-token-metadata-cli` [tool](https://github.com/metaplex-foundation/metaplex-program-library/tree/master/token-metadata/cli):

    `~ $: ./mpl-fixed-price-sale-cli init-selling-resource --store 'STORE_ADDRESS' --resource_mint 'EDITION_MINT' --resource_token 'EDITION_TOKEN'`

3. And finally create market with price denomination in native `SOL`'s:

    `~ $: ./mpl-fixed-price-sale-cli create-market --selling_resource 'SELLING_RESOURCE_ADDRESS' --name example3 --description example4 --mutable false --price 1.0`