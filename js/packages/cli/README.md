
Format

* Folder with files named from 0-1.png
* JSON file with attributes, format
    - Array with indices matching images
    - Contains: title, description and array of traits ({"display_type":"number","trait_type":"generation","value":2})


Install and build
```
yarn install 
yarn build
yarn run package:linuxb
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

4. Set the start date for your candy machine.
```
metaplex set_start_date -k ~/.config/solana/id.json -d "20 Apr 2021 04:20:00 GMT"
ts-node cli set_start_date -k ~/.config/solana/id.json -d "20 Apr 2021 04:20:00 GMT"
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
```
