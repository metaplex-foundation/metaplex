
# Candy Machine! aka @metaplex/cli
## Format

* Folder with files named from 0-1.png
* JSON file with attributes, format
    - Array with indices matching images
    - Contains: title, description and array of traits ({"display_type":"number","trait_type":"generation","value":2})


## Quick Start

Install dependencies in root of this folder

```bash
yarn install
yarn build
```

Build `metaplex` cli tool

```bash
yarn run package:macos
// or
npx pkg . -d --targets node14-macos-x64 --output bin/macos/metaplex
```

Add metaplex cli to $PATH

```bash
cp bin/macos/metaplex /usr/local/bin
```

Upload assets to the arweave and register for candy-machine (get keypair path with `solana config get`). Should follow [Metaplex NFT Standard](https://docs.metaplex.com/nft-standard)

```bash
metaplex upload ./assets --env devnet -k path_to_your_keypair
```

Verify assets

```bash
 metaplex verify -k path_to_your_keypair
```

Start candy-machine

```bash
metaplex create_candy_machine  -e devnet -k path_to_your_keypair
```
Set sale start date

```bash
metaplex set_start_date -d "09 Sep 2021 15:20:00 GMT" -k path_to_your_keypair
```

Mint NFT to your wallet
```bash
metaplex mint_one_token -e devnet -k path_to_your_keypair
```

Verify NFT inside your wallet. Should be one new token with balance `1`
```bash
spl-token accounts
```


## assets folder
* Folder with file pairs named from with growing integer numbers starting from  0.png and 0.json
* the image HAS TO be a `PNG`
* JSON format can be checked out here: https://docs.metaplex.com/nft-standard. example below:
```json
{
  "name": "Solflare X NFT",
  "symbol": "",
  "description": "Celebratory Solflare NFT for the Solflare X launch",
  "seller_fee_basis_points": 0,
  "image": "https://www.arweave.net/abcd5678?ext=png",
  "animation_url": "https://www.arweave.net/efgh1234?ext=mp4",
  "external_url": "https://solflare.com",
  "attributes": [
    {
      "trait_type": "web",
      "value": "yes"
    },
    {
      "trait_type": "mobile",
      "value": "yes"
   },
   {
      "trait_type": "extension",
      "value": "yes"
    }
  ],
  "collection": {
     "name": "Solflare X NFT",
     "family": "Solflare"
  },
  "properties": {
    "files": [
      {
        "uri": "https://www.arweave.net/abcd5678?ext=png",
        "type": "image/png"
      },
      {
        "uri": "https://watch.videodelivery.net/9876jkl",
        "type": "unknown",
        "cdn": true
      },
      {
        "uri": "https://www.arweave.net/efgh1234?ext=mp4",
        "type": "video/mp4"
      }
    ],
    "category": "video",
    "creators": [
      {
        "address": "creator_sol_address",
        "share": 100
      }
    ]
  }
}
