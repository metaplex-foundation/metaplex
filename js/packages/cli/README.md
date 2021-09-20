# CANDY MACHINE

https://user-images.githubusercontent.com/81876372/133098938-dc2c91a6-1280-4ee1-bf0e-db0ccc972ff7.mp4

## assets folder
* Folder with file pairs named with inrementing integer numbers starting from  0.png and 0.json
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

Install and build
```
yarn install 
yarn build
yarn run package:linuxb
OR
yarn run package:linux
OR 
yarn run package:macos
```

You can now either use `metaplex` OR the `ts-node cli` to execute the following commands. 

1. Upload your images and metadata. Refer to the NFT [standard](https://docs.metaplex.com/nft-standard) for the correct format.
```
metaplex upload ~/nft-test/mini_drop --keypair ~/.config/solana/id.json 
ts-node cli upload ~/nft-test/mini_drop --keypair ~/.config/solana/id.json
```

2. Verify everything is uploaded. Rerun the first command until it is.
```
metaplex verify --keypair ~/.config/solana/id.json 
ts-node cli verify --keypair ~/.config/solana/id.json 
```

3. Create your candy machine. It can cost up to ~15 solana per 10,000 images. 
```
metaplex create_candy_machine -k ~/.config/solana/id.json -p 1
ts-node cli create_candy_machine -k ~/.config/solana/id.json -p 3
```

4. Set the start date and update the price of your candy machine.
```
metaplex update_candy_machine -k ~/.config/solana/id.json -d "20 Apr 2021 04:20:00 GMT" -p 0.1
ts-node cli update_candy_machine -k ~/.config/solana/id.json -d "20 Apr 2021 04:20:00 GMT" -p 0.1
```

5. Test mint a token (provided it's after the start date)
```
metaplex mint_one_token -k ~/.config/solana/id.json
ts-node cli mint_one_token -k ~/.config/solana/id.json
```

6. Check if you received any tokens.
```
spl-token accounts 
```

7. If you are listed as a creator, run this command to sign your NFTs post sale. This will sign only the latest candy machine that you've created (stored in .cache/candyMachineList.json).
```
metaplex sign_candy_machine_metadata -k ~/.config/solana/id.json
ts-node cli sign_candy_machine_metadata -k ~/.config/solana/id.json
```

8. If you wish to sign metadata from another candy machine run with the --cndy flag.
```
metaplex sign_candy_machine_metadata -k ~/.config/solana/id.json --cndy CANDY_MACHINE_ADDRESS_HERE
ts-node cli sign_candy_machine_metadata -k ~/.config/solana/id.json --cndy CANDY_MACHINE_ADDRESS_HERE

