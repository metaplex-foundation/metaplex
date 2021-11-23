# CANDY MACHINE

https://user-images.githubusercontent.com/81876372/133098938-dc2c91a6-1280-4ee1-bf0e-db0ccc972ff7.mp4

## Creating generative art

1. Create a `traits` folder and create a list of directories for the traits (i.e. background, shirt, sunglasses). Look at the `example-traits` for guidance
2. Run the following command to create a configuration file called `traits-configuration.json`:
NOTE: The <directory> should be point to your traits folder you created in step 1
```
metaplex generate_art_configurations <directory>
ts-node cli generate_art_configurations <directory>
```

The following file will be generated (based off of `example-traits`):

```json
{
  "name": "",
  "symbol": "",
  "description": "",
  "creators": [],
  "collection": {},
  "premadeCustoms": [
    {
      "background": "blue.png",
      "eyes": "egg-eyes.png",
      "face": "cyan-face.png",
      "mouth": "block-mouth.png"
    },
    {
      "background": "red.png",
      "eyes": "egg-eyes.png",
      "face": "cyan-face.png",
      "mouth": "block-mouth.png"
    }
  ],
  "dnp": {
    "background": {
      "blue.png": {
        "eyes": ["egg-eyes.png", "heart-eyes.png"]
      }
    }
  },
  "breakdown": {
    "background": {
      "blue.png": 0.04,
      "brown.png": 0.04,
      "flesh.png": 0.05,
      "green.png": 0.02,
      "light-blue.png": 0.06,
      "light-green.png": 0.01,
      "light-pink.png": 0.07,
      "light-purple.png": 0.05,
      "light-yellow.png": 0.06,
      "orange.png": 0.07,
      "pink.png": 0.02,
      "purple.png": 0.03,
      "red.png": 0.05,
      "yellow.png": 0.43
    },
    "eyes": {
      "egg-eyes.png": 0.3,
      "heart-eyes.png": 0.12,
      "square-eyes.png": 0.02,
      "star-eyes.png": 0.56
    },
    "face": {
      "cyan-face.png": {
        "baseValue": 0.07,
        "background": {
          "blue.png": 0.9,
          "brown.png": 0.1
        }
      },
      "dark-green-face.png": 0.04,
      "flesh-face.png": 0.03,
      "gold-face.png": 0.11,
      "grapefruit-face.png": 0.07,
      "green-face.png": 0.05,
      "pink-face.png": 0.05,
      "purple-face.png": 0.02,
      "sun-face.png": 0.1,
      "teal-face.png": 0.46
    },
    "mouth": {
      "block-mouth.png": 0.23,
      "smile-mouth.png": 0.09,
      "triangle-mouth.png": 0.68
    }
  },
  "order": ["background", "face", "eyes", "mouth"],
  "width": 1000,
  "height": 1000
}
```

3. Go through and customize the fields in the `traits-configuration.json`, such as `name`, `symbol`, `description`, , `creators`, `collection`, `width`, and `height`.
4. After you have adjusted the configurations to your heart's content, you can run the following command to generate the JSON files along with the images.

```
metaplex create_generative_art -c <configuration_file_location> -n <number_of_images>
ts-node cli create_generative_art -c <configuration_file_location> -n <number_of_images>
```

5. This will create an `assets` folder, with a set of the JSON and PNG files to make it work!

6. Note: Need to use a PSD instead of pngs? That's fine. You can have a PSD with two levels of layers - a top level like HEAD and then sublevel like "White Hat", "Black Hat", etc. Then you can create a traits
   configuration where the hash of each feature is named "HEAD" and then each layer shows up as a key with
   a probability, instead of PNGs. Then you can use the -o ability of the create_generative_art app
   to output just JSON files to the assets folder AND a whole array of arrays json to be used by the psd_layer_generator.py app to actually generate the images.

NOTE: Do not forget that "No Traits" is a special reserved key for this app.

To use the psd_layer_generator, do:

```
python psd_layer_generator.py -p ./traits.psd -o assets/ -t sets.json -e "FINISHERS" -n 0
```

Where sets is your output from the create generate command, and -e is an optional layer you toggle to true
for every item. You may need this if you have extra finishing touches.

## assets folder

- Folder with file pairs named with incrementing integer numbers starting from 0.png and 0.json
- the image HAS TO be a `PNG`
- JSON format can be checked out here: https://docs.metaplex.com/nft-standard. example below:

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
yarn run package:macos-x64
OR
yarn run package:macos-m1
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

6. Test mint multiple tokens 

```
metaplex mint_multiple_tokens -k ~/.config/solana/id.json -n 100
ts-node cli mint_multiple_tokens -k ~/.config/solana/id.json -n 100
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
```
