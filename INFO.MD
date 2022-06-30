Commands:
-- Metaplex install 
yarn install ~/solana-nft/metaplex/js     

-- Solana CLI configuration --
solana config set --url https://api.devnet.solana.com
solana config set --url https://api.mainnet-beta.solana.com
solana config set --keypair ~/.config/solana/devnet.json

-- Upload commands --
Mac or Linux
CREATE:
ts-node ./packages/cli/src/candy-machine-v2-cli.ts upload ./packages/cli/assets -e devnet -k ~/.config/solana/devnet.json -cp config.json -c temp -l trace
CHECK:
ts-node ./packages/cli/src/candy-machine-v2-cli.ts show -e devnet -k ~/.config/solana/devnet.json 
UPDATE:
 ts-node ./packages/cli/src/candy-machine-v2-cli.ts update_candy_machine ./packages/cli/assets -e devnet -k ~/.config/solana/devnet.json -cp config.json -c temp -l trace
npx ts-node ./packages/cli/src/cli-nft.ts

address DZfWSnN8KL6rLbTBg7bCa7s84bzv2vz8PeXzHd1zEJau

Config File: /root/.config/solana/cli/config.yml
RPC URL: https://api.devnet.solana.com 
WebSocket URL: wss://api.devnet.solana.com/ (computed)
Keypair Path: /root/.config/solana/devnet.json 
Commitment: confirmed 

-----------------------------------------------

Candy machine address:  D4ZwrcP8MWShrGNuB6ABLrmgunhYAUfjE8vCBgG7Mf9J
Collection metadata address:  Ct4dsJ63pD58EVbhSNjPvBcoFxZgmayWQEt56wyDVtiR
Collection metadata authority:  DZfWSnN8KL6rLbTBg7bCa7s84bzv2vz8PeXzHd1zEJau
Collection master edition address:  2wVQtHsGWLtGa9685Z42hqFF89Wksj1CdJXKm8p71Ee9
Collection mint address:  her3x9gYnwp7acdt6AC1ReXe6PsfyedrJBaSr3XQCZ6
Collection PDA address:  5sgnz6A7KEBijZBi5rCodEX2YX3RwS6MAL6UnN9gGgKJ
Collection authority record address:  AdfaNnTDn9yXLbcNgGCHJ8nHbvGz3LZbiEQfV8TvkNby
Collection:  {
  collectionMetadata: 'Ct4dsJ63pD58EVbhSNjPvBcoFxZgmayWQEt56wyDVtiR',
  collectionPDA: '5sgnz6A7KEBijZBi5rCodEX2YX3RwS6MAL6UnN9gGgKJ',
  txId: '4TyZaAesy9X5iQLpaXhw4RCvuTEhNx21KtEVTf2RncBTH8yAw6zFZfpgngivuQMGZdQCrPMVJ6BMSfJszEdDzbiM'

}

https://arweave.net/5sgnz6A7KEBijZBi5rCodEX2YX3RwS6MAL6UnN9gGgKJ

initialized config for a candy machine with publickey: D4ZwrcP8MWShrGNuB6ABLrmgunhYAUfjE8vCBgG7Mf9J
[0] out of [10] items have been uploaded
Starting upload for [10] items, format {"mediaExt":".png","index":"0"}
Progress: [████████████████████████████████████████] 100% | 10/10
Skipping upload to chain as this is a hidden Candy Machine
Done. Successful = true.
ended at: 2022-06-29T19:54:40.071Z. time taken: 00:00:21
wallet public key: DZfWSnN8KL6rLbTBg7bCa7s84bzv2vz8PeXzHd1zEJau
Using cluster devnet
...Candy Machine...
Key: D4ZwrcP8MWShrGNuB6ABLrmgunhYAUfjE8vCBgG7Mf9J
1st creator : BKmJnpt3p61RVqRmGP7b1b1u4kVy5nr6N1Gc47BjH7EH
authority:  DZfWSnN8KL6rLbTBg7bCa7s84bzv2vz8PeXzHd1zEJau
wallet:  DZfWSnN8KL6rLbTBg7bCa7s84bzv2vz8PeXzHd1zEJau
Collection mint:  her3x9gYnwp7acdt6AC1ReXe6PsfyedrJBaSr3XQCZ6
Collection PDA:  5sgnz6A7KEBijZBi5rCodEX2YX3RwS6MAL6UnN9gGgKJ
tokenMint:  null
uuid:  100000
price:  10000000
itemsAvailable:  10
itemsRedeemed:  0
goLiveDate:  2022-07-01T13:00:00.000Z
symbol:  NB
sellerFeeBasisPoints:  500
creators: 
6j4nNrozTJkk1zatiXHezSLZArnRUq3WkGKHACThXGpZ at 100 %
maxSupply:  0
retainAuthority:  true
isMutable:  true
hidden settings:  {
  name: 'Fantasy',
  uri: 'uri',
  hash: [
     52, 102, 97, 52,  55, 97, 101,  56,
     99,  54, 49, 51, 100, 98,  97,  97,
    100, 100, 50, 54,  99, 99,  51,  99,
     51, 101, 53, 50,  55, 57,  52, 102
  ]
}
End settings: 
End when 10 sold
No captcha for this candy machine
no whitelist settings