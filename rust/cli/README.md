[![build status](https://github.com/CalebEverett/metaplex/actions/workflows/rust-cli.yml/badge.svg)](https://github.com/CalebEverett/metaplex/actions/workflows/rust-cli.yml)


# Metaplex Command Line Interface

This is a starting point to develop command line applications that interact with the metaplex programs. It includes output features and cli tooling from the [Solana token program cli](https://github.com/solana-labs/solana-program-library/tree/master/token/cli/src), including the ability to produce output for display or json, either normal or compact, and use default values from solana-cli local config. Also makes use of [solana-clap-utils](https://github.com/solana-labs/solana/tree/master/clap-utils) for efficient validation and argument parsing.

## Implemented commands

* `mint-info`: display information for an existing mint account.
* `metadata-info`: display information for an existing metadata account.
* `metadata-create`: create a new metadata account for an existing mint, including creators and shares.
* `metadata-update`: update an existing metadata account by providing either a mint or metadata account address and providing values for one or more updatable fields:
    * new_update_authority
    * name
    * symbol
    * uri
    * seller_fee_basis_points
    * creators
    * primary_sale_happened
* `nft-create`: create a de novo nft including mint, token account, metadata account and master edition.

## Getting Started

1. `cd rust/cli`
2. `cargo build`
3. `cargo run -- -help`

## Usage

### Create an NFT

```
cargo-run -- nft-create
```

This brief command kicks off the process of minting a token, creating a token account, minting one token to the account, creating a metadata account and finally, creating a master edition. You can add one or more values for name, symbol, uri, or creators after `nft-create`. Creator shares have to sum to 100, values are specified in whole integer percentages and if you provide any creators, one of them has to be the same as the update authority. The update authority defaults to the wallet address in the local Solana config, but you can provide another one by flag.

### View Metadata Info

```
cargo-run -- metadata-info Cbg5o1tarienqQeQ8FcS6inGw2edrZ73znyYhVFtXa8b

```

 You can pass either the metadata account or token mint address. Without any values provided for the metadata fields, this produces a blank NFT, but it can be updated later since the `--immutable` flag wasn't set.

 ```

Address: qHFGEW7vnW61Arupoo4WcV3uqoDiRRhFv3fzHGPusBt
Key: MetadataV1
Update Authority: 61mVTaw6hBtwWnSaGXRSJePFWEQqipeCka3evytEVNUp
Mint: Cbg5o1tarienqQeQ8FcS6inGw2edrZ73znyYhVFtXa8b
Primary Sale Happened: false
Is Mutable: true
Edition Nonce: 255
Name:
Symbol:
Uri:
Seller Fee Basis Points: 0
```

If you want the output in json, you can add `json` or `json-compact` to the `--output` flag.


```
cargo run -- metadata-info --output json Cbg5o1tarienqQeQ8FcS6inGw2edrZ73znyYhVFtXa8b

```

```
{
  "address": "qHFGEW7vnW61Arupoo4WcV3uqoDiRRhFv3fzHGPusBt",
  "metadata": {
    "key": "MetadataV1",
    "updateAuthority": "61mVTaw6hBtwWnSaGXRSJePFWEQqipeCka3evytEVNUp",
    "mint": "Cbg5o1tarienqQeQ8FcS6inGw2edrZ73znyYhVFtXa8b",
    "name": "",
    "symbol": "",
    "uri": "",
    "sellerFeeBasisPoints": "0",
    "creators": null,
    "primarySaleHappened": false,
    "isMutable": true,
    "editionNonce": "255"
  }
}
```
### Update Metadata

Metadata can be updated with the `metadata-update` command, providing at least one additional flag with the value to be updated. Creators are specified with an address followed by a colon and then the respective share. For example, if we wanted to update the above metadata, we could enter:

```
cargo run -- metadata-update qHFGEW7vnW61Arupoo4WcV3uqoDiRRhFv3fzHGPusBt \
    --name "My NFT" --symbol "NFT" \
    --creators 61mVTaw6hBtwWnSaGXRSJePFWEQqipeCka3evytEVNUp:50 7oHuVGKc5ZA2tdJX2xLxfUuZPf4RWMsEuNFWkByZNNs7:50 \
    --uri ipfs://tbd
```

Same as with `nft-create`, you can provide either the token mint address or the metadata account address.


```
cargo run -- metadata-info Cbg5o1tarienqQeQ8FcS6inGw2edrZ73znyYhVFtXa8b
```

to see the updates:

```
Address: qHFGEW7vnW61Arupoo4WcV3uqoDiRRhFv3fzHGPusBt
Key: MetadataV1
Update Authority: 61mVTaw6hBtwWnSaGXRSJePFWEQqipeCka3evytEVNUp
Mint: Cbg5o1tarienqQeQ8FcS6inGw2edrZ73znyYhVFtXa8b
Primary Sale Happened: false
Is Mutable: true
Edition Nonce: 255
Name: My NFT
Symbol: NFT
Uri: ipfs://tbd
Seller Fee Basis Points: 0
Creators: 2
  [0] Address: 61mVTaw6hBtwWnSaGXRSJePFWEQqipeCka3evytEVNUp
      Verified: false
      Share: 50

  [1] Address: 7oHuVGKc5ZA2tdJX2xLxfUuZPf4RWMsEuNFWkByZNNs7
      Verified: false
      Share: 50
```

## Todo
1. Add individual commands for minting tokens and creating master editions
2. Display edition info
3. Bulkify
4. Upload to storage
5. Vault
6. Auction
6. Candy Store
6. Fractionalization
7. Custom Edition Metadata
