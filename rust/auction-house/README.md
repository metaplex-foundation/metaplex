# Auction House

The auction house program allows for any wallet to run a Metaplex NFT secondary marketplace and sellers to list their NFTs with registered auction houses. Sellers are not required to transfer their NFT into an escrow account managed by the marketplace and maintain custody of the NFT up until the sale.

Auction houses receive a fee as a percentage of the sale. The seller fee is stored on the auction house account and applies to all sales brokered by the auction house. The selling of the NFT will reduct the auction house seller fee and the royalty payout set on the NFT. The auction house seller funds are sent to a treasury and royalties paid to the co-creators based on the split set on the NFT. The remainder of the proceeds are sent to the seller's wallet.

Collectors looking to purchase an NFT listed with an auction house can make offers. Each offer results in a program derived address (PDA) account that stores the offer amount in escrow until the auction house fulfills the sale order or the collector cancels their order by draining the funds from the escrow account.

When an owner of an NFT lists with an auction house they set the floor price but the auction house may gather additional buyers and execute the sale at a higher price. There is no price discovery engine (such as an auction) in place so its on the auction house to facilitate offers on the NFT outside of the program.

An auction house may run in "can change sale price" mode which gives it full rights to set the price on the NFT.

Auction houses can be used to buy and sell any SPL token not just Metaplex NFTs.

## Accounts

### Auction House

seed - ["auction_house", "<authority_address>", "<treasury_mint_address>"]

An account that represents the secondary marketplace. Some key fields tracked by the account include:

- Creator - The wallet that created the auction house.
- Treasury Withdraw Destination - The wallet that receives seller funds for the auction house.
- Fee Withdraw Destination - A wallet that can be used to pay for Solana fees for the seller.
- Authority - The wallet with permission to update the auction house and process sales.
- Seller Fee Basis Points - The share of the sale the auction house takes on all NFTs.
- Requires Sign Off - The auction house must sign all sales orders.
- Can Change Sale Price - The auction house may adjust the sale price of NFTs listed with it.

### Auction House Trade State

seed - ["auction_house", "<wallet_address>", "<auction_house_address>", "<token_account_address>", "<treasury_mint_address>", "<token_mint_address>", "<buy_price>", "<token_size>"]

Represents a NFT (or spl token) up for sale and offers. When the trade states between a buyer and a seller match a sale can be executed.

## Setup

### CLI

The simplest way of interacting with the Auction House program is through the metaplex cli. In order to use the cli you need to have `ts-node` installed globally on your workstation.

```
$ yarn global add ts-node
$ cd js
$ yarn install
$ cd packages/cli
$ ts-node src/auction-house-cli.ts help --version
0.0.1
```

## Actions

The set of available actions supported by the program with a short description on it's purpose and accounts required to execute the instruction.

_Create Auction House_

Creates an auction house account whose authority is a file system wallet set with `-k`. In this example, the auction house is setup to take a 10% seller fee with `-sfb=1000`, change sell price of NFT with `-ccsp`, and requires the authority of the action house to sign all transactions with `-rso=true`.

```
$ ts-node src/auction-house-cli.ts create_auction_house \
  -k ~/.config/solana/auction-house.json \
  -sfbp 1000 -ccsp -rso true

wallet public key: DCDcpZaJUghstQNMHy9VAPnwQe1cGsHq7fbeqkti4kM3
No treasury withdrawal dest detected, using keypair
No fee withdrawal dest detected, using keypair
No treasury mint detected, using SOL.
Created auction house Ee53kiwLVw5XG98gSLNHoQRi4J22XEhz3zsKYY2ttsb7
```

_Show Auction House_

Prints the balances of the fee and treasury wallets configured for the auction house and its current settings options.

```
$ ts-node src/auction-house-cli.ts show \
-k ~/.config/solana/auction-house.json \
-ah Ee53kiwLVw5XG98gSLNHoQRi4J22XEhz3zsKYY2ttsb7

No treasury mint detected, using SOL.
-----
Auction House: Ee53kiwLVw5XG98gSLNHoQRi4J22XEhz3zsKYY2ttsb7
Mint: So11111111111111111111111111111111111111112
Authority: DCDcpZaJUghstQNMHy9VAPnwQe1cGsHq7fbeqkti4kM3
Creator: DCDcpZaJUghstQNMHy9VAPnwQe1cGsHq7fbeqkti4kM3
Fee Payer Acct: AcWpR41NPMq73FZUspCiXxoLrJnW7zytgHKY5xqtETkU
Treasury Acct: HFW5CY73qN3XK3qEP7ZFxbpBBkQtipPfPQzaDj3mbbY1
Fee Payer Withdrawal Acct: DCDcpZaJUghstQNMHy9VAPnwQe1cGsHq7fbeqkti4kM3
Treasury Withdrawal Acct: DCDcpZaJUghstQNMHy9VAPnwQe1cGsHq7fbeqkti4kM3
Fee Payer Bal: 0
Treasury Bal: 0
Seller Fee Basis Points: 100
Requires Sign Off: false
Can Change Sale Price: false
AH Bump: 255
AH Fee Bump: 252
AH Treasury Bump: 254
```

Before processing actions against the auction house make sure to fund the fee account.

```
$ solana airdrop 2 AcWpR41NPMq73FZUspCiXxoLrJnW7zytgHKY5xqtETkU
Requesting airdrop of 2 SOL

Signature: 4qYFoD8GN6TZLDjLsqyyt6mhjYEjwKF36LJCDLtL88nTD3y3bFzXmVFHP6Nczf5Dn4GnmBJYtbqV9tN2WbsYynpX

2 SOL
```

_Sell_

Place an NFT for sale by its mint address with the auction house for 1 SOL. Since the auction house is setup to require sign off it's wallet, as well as the seller are provided to the command.

In a production scenerio where the keypair for the auction house is stored on a sever managed by the organization hosting the auction house the transaction should be partial signed by the seller from the client then passed to the server for signing by the auction house before submitting to Solana.

```
$ ts-node src/auction-house-cli.ts sell \
  -k ~/.config/solana/auction-house-seller.json \
  -ak ~/.config/solana/auction-house.json \
  -ah Ee53kiwLVw5XG98gSLNHoQRi4J22XEhz3zsKYY2ttsb7 \
  --buy-price 1 \
  --mint F7fejo7cT1fRyJxj1W2aWy3aeJz8iqLU9YvbBAzwJGh2 \
  --token-size 1

wallet public key: CCJC2s8FDGAs8GqmngE9gviusEuNnkdUwchcYMZ8ZmHB
wallet public key: DCDcpZaJUghstQNMHy9VAPnwQe1cGsHq7fbeqkti4kM3

Set 1 F7fejo7cT1fRyJxj1W2aWy3aeJz8iqLU9YvbBAzwJGh2 for sale for 1 from your account with Auction House Ee53kiwLVw5XG98gSLNHoQRi4J22XEhz3zsKYY2ttsb7
```

_Buy_

Place an offer on an NFT by its mint address at some price in SOL when using native SOL as the mint. The buy command is an offer on the NFT and will not result in a sale until the `execute_sale` action is triggered by the auction house authority.

```
$ ts-node src/auction-house-cli.ts sell \
  -k ~/.config/solana/auction-house-buyer.json \
  -ak ~/.config/solana/auction-house.json \
  -ah Ee53kiwLVw5XG98gSLNHoQRi4J22XEhz3zsKYY2ttsb7 \
  --buy-price 1 \
  --token-size 1 \
  --mint 7v8kcqCHLih31bp2xwMojGWTMdrcFfzZsYXNbiLiRYgE

wallet public key: 3DikCrEsfAVHv9rXENg2Hdmc16L71EjveQEF4NbSfRak
wallet public key: DCDcpZaJUghstQNMHy9VAPnwQe1cGsHq7fbeqkti4kM3
Made offer for  1
```
_Execute Sale_

Sell an NFT to a buyer at the price set by the seller.

```
$ ts-node src/auction-house-cli.ts execute_sale -k ~/.config/solana/auction-house-seller.json \
-ak ~/.config/solana/auction-house.json \
-ah Ee53kiwLVw5XG98gSLNHoQRi4J22XEhz3zsKYY2ttsb7 \
--auction-house-signs \
--buy-price 1 \
--mint DCqt9QQ3ot3qv53EhWrYAWFuh4XgSvFJvLRjgsDnhLTp \
--buyer-wallet 3DikCrEsfAVHv9rXENg2Hdmc16L71EjveQEF4NbSfRak \
--seller-wallet CCJC2s8FDGAs8GqmngE9gviusEuNnkdUwchcYMZ8ZmHB \
--token-size 1

wallet public key: CCJC2s8FDGAs8GqmngE9gviusEuNnkdUwchcYMZ8ZmHB
wallet public key: DCDcpZaJUghstQNMHy9VAPnwQe1cGsHq7fbeqkti4kM3
Accepted 1 DCqt9QQ3ot3qv53EhWrYAWFuh4XgSvFJvLRjgsDnhLTp sale from wallet CCJC2s8FDGAs8GqmngE9gviusEuNnkdUwchcYMZ8ZmHB to 3DikCrEsfAVHv9rXENg2Hdmc16L71EjveQEF4NbSfRak for 1 from your account with Auction House Ee53kiwLVw5XG98gSLNHoQRi4J22XEhz3zsKYY2ttsb7
```

Other actions supported by the program:

- _Cancel_ - Potential buyer revokes their offer.

- _Show Escrow_ - Print out the balance of an auction house escrow account for a given wallet.

- Withdraw_ - Transfer funds from user's buyer escrow account for the auction house to their wallet.

- _Deposit_ - Add funds to user's buyer escrow account for the auction house.

- _Withdraw from Fee_ - Transfer funds from auction house fee wallet to the auction house authority.

- _Widthraw from Treasury_ - Transfer funds from the auction house treasury wallet to the auction house authority.

- _Update Auction House_ - Update any of the auction house settings including it's authority or saller fee.
