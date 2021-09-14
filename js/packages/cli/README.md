# Candy Machine!

Install dependencies
```
yarn
```


## usage
```shell
metaplex upload /path/to/assets -e devnet --keypair /path/to/admin-payer -n 3
metaplex create_candy_machine -e devnet --keypair /path/to/admin-payer --price 1.5
metaplex set_start_date -e devnet --keypair /path/to/admin-payer
metaplex mint_one_token -e devnet --keypair /path/to/user-payer
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
        "address": "SOLFLR15asd9d21325bsadythp547912501b",
        "share": 100
      }
    ]
  }
}
```
