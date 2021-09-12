
Format

* Folder with files named from 0-1.png
* JSON file with attributes, format
    - Array with indices matching images
    - Contains: title, description and array of traits ({"display_type":"number","trait_type":"generation","value":2})


Install dependencies
```
yarn 
```
metaplex upload ~/nft-test/mini_drop --env devnet --keypair ~/.config/solana/id.json 
ts-node cli upload ~/nft-test/mini_drop --env devnet --keypair ~/.config/solana/id.json 

metaplex verify --keypair ~/.config/solana/id.json 
ts-node cli verify --keypair ~/.config/solana/id.json 

metaplex create_candy_machine -k ~/.config/solana/id.json -p 1
ts-node cli create_candy_machine -k ~/.config/solana/id.json -p 1

metaplex set_start_date -k ~/.config/solana/id.json -d "20 Apr 2021 04:20:00 GMT"
ts-node cli set_start_date -k ~/.config/solana/id.json -d "20 Apr 2021 04:20:00 GMT"

metaplex mint_one_token -k ~/.config/solana/id.json
ts-node cli mint_one_token -k ~/.config/solana/id.json
 
spl-token accounts 

metaplex sign_candy_machine_metadata -k ~/.config/solana/id.json
ts-node sign_candy_machine_metadata -k ~/.config/solana/id.json

