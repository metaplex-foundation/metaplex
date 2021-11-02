<p align="center">
  <a href="https://metaplex.com">
    <img alt="Metaplex" src="https://metaplex.com/static/logos/metaplex.svg" width="250" />
  </a>
</p>

Metaplex is a protocol built on top of Solana that allows:

- **Creating/Minting** Non-Fungible Tokens;
- **Starting** A variety of auctions for primary/secondary sales;
- and **Visualizing** NFTs in a standard way across wallets and applications.

Metaplex is comprised of two core components: an on-chain program, and a self-hosted front-end web3 application.

## Important NOTE

Metaplex now follows a release versioning process called semantic versioning. If you are make a new market place, launching a candy machine or any live project that will handle real money, we recommend using a release tag. Using a release tag will ensure that new changes don't break your UI.

https://github.com/metaplex-foundation/metaplex/releases

### How to checkout a release
```
//If you are using a fork
git fetch upstream --tags

git checkout tags/<tag> // this will bring the contents of the tag into your current branch

// OR 
git checkout tags/<tag> -b <your local branch name> // this will make a new branch for you

To swich to a new release

git checkout tags/<tag> -b new_version_branch /// this will take the new tag and bring it into  anew branch
//Switch back to the branch you want the new changes in
git rebase new_version_branch
```

## In Depth Developer's Guide

If you want to deep dive on the Architecture, you can do so here:

https://docs.metaplex.com/

## Installing

Clone the repo, and run `yarn start` to deploy.

```bash
$ git clone https://github.com/metaplex-foundation/metaplex.git
$ cd metaplex/js
$ yarn install && yarn bootstrap && yarn build
$ yarn start
```

Navigate to `http://localhost:3000/` to explore the deployed application.

## Rust Programs

The Rust programs will soon be added to this repo with JavaScript
bindings that allow interactivity.

## Community

We have a few channels for contact:

- [Discord](https://discord.gg/metaplex)
- [@metaplex](https://twitter.com/metaplex) on Twitter
- [GitHub Issues](https://github.com/metaplex-foundation/metaplex/issues)

# Protocol

## Non-fungible tokens(NFT)

Metaplex's non-fungible-token standard is a part of the Solana Program Library (SPL), and can be characterized as a unique token with a fixed supply of 1 and 0 decimals. We extended the basic definition of an NFT on Solana to include additional metadata such as URI as defined in ERC-721 on Ethereum.

Below are the types of NFTs that can be created using the Metaplex protocol.

### **Master Edition**

A master edition token, when minted, represents both a non-fungible token on Solana and metadata that allows creators to control the provenance of prints created from the master edition.

Rights to create prints are tokenized itself, and the owner of the master edition can distribute tokens that allow users to create prints from master editions. Additionally, the creator can set the max supply of the master edition just like a regular mint on Solana, with the main difference being that each print is a numbered edition created from it.

A notable and desirable effect of master editions is that as prints are sold, the artwork will still remain visible in the artist's wallet as a master edition, while the prints appear in the purchaser's wallets.

### **Print**

A **print** represents a copy of an NFT, and is created from a Master Edition. Each print has an edition number associated with it.

Usually, prints are created as a part of an auction that has happened on Metaplex, but they could also be created by the creator manually.

For limited auctions, each print number is awarded based on the bid placement.

Prints can be created during [Open Edition](#open-edition) or [Limited Edition](#limited-edition) auction.

### Normal NFT

A normal NFT (like a Master Edition) when minted represents a non-fungible token on Solana and metadata, but lacks rights to print.

An example of a normal NFT would be an artwork that is a one-of-a-kind that, once sold, is no longer within the artist's own wallet, but is in the purchaser's wallet.

## Types of Auctions

Metaplex currently supports four types of auctions that are all derived from English auctions.

Basic parameters include:

- Auction start time
- Auction end time
- Reservation price

Additionally, Metaplex includes a novel concept of the participation NFT. Each bidding participant can be rewarded a unique NFT for participating in the auction.

The creator of an auction also has the ability to configure a minimal price that should be charged for redemption, with the option to set it as "free".

### Single Item

This type of auction can be used to sell normal NFTs and re-sell Prints, as well as the sale of Master Edition themselves (and the associated printing rights) if the artist so wishes. While this last behavior is not exposed in the current UI, it does exist in the protocol.

### Open Edition

An open edition auction requires the offering of a Master Edition NFT that specifically has no set supply. The auction will only create Prints of this item for bidders: each bidder is guaranteed to get a print, as there are no true "winners" of this auction type.

An open edition auction can either have a set fixed price (equivalent to a Buy Now sale), can be set to the bid price (Pay what you want), or can be free (Make any bid to get it for free).

### Limited Edition

For a limited edition auction, a Master Edition NFT (of limited or unlimited supply) may be provided to the auction with a number of copies as the set amount of winning places.

For each prize place, a Print will be minted in order of prize place, and awarded to the winning bidder of that place.

For example, the first place winner will win Print #1; the second place winner Print #2; and so on.

It is required for limited supply NFTs that there is atleast as much supply remaining as there are desired winners in the auction.

### Tiered Auction

A tiered auction can contain a mix of the other three auction types as winning placements. For instance, the first place winner could win a Print of Limited Edition NFT A, while the second-place winner could win Normal NFT, and so on. Additionally, all participants who did not win any place could get a Participation NFT Print from a Master Edition (if the Master Edition had no supply limit).

## Royalties

Metaplex can seamlessly create on-chain artist splits that remove the awkwardness out of collaboration.

Tag each collaborator, set custom percentages, and you’re off to the races. Each NFT can also be minted with configurable royalty payments that are then sent automatically back to the original creators whenever an artwork is resold on a Metaplex marketplace in the future.

## Storefronts

Metaplex's off-chain component allows creators to launch a custom storefront, similar to Shopify or WordPress. This open-source project provides a graphical interface to the on-chain Metaplex program, for creators, buyers, and curators of NFTs. The design and layout of storefronts can be customized to suit the needs of the entity creating it, either as a permanent storefront or an auction hub for a specific auction or collection.

All identification on the Storefront is based on wallet addresses. Creators and store admins sign through their wallets, and users place bids from connected wallets. Custom storefronts allow creators to create unique experiences per auction. Additionally, the Metaplex Foundation is working on multiple partnerships that will enable building immersive storefronts using VR/AR.

## Development

### Testing

Testing changes to a rust program

```
# Change to devnet
solana config set --url devnet

# Build the project (takes a few mins)
cd rust
cargo build-bpf

# While you wait for the previous step to complete, find the current program id
# of the program you plan to test by searching the code base.  Save this for
# later.

# After the build step completes, deploy the program to devnet
solana program deploy ./path/to/the_program.so -u devnet

# NOTE: If you receive an error stating insufficient funds, recoup the funds
# used during the failed deployment. You may also see the following error which
# also means insufficient funds:
#     "Error: Deploying program failed: Error processing Instruction 1: custom program error: 0x1"
solana program close --buffers

# NOTE: If you had an insufficient funds, airdrop yourself some SOL, then run the deploy
# command again. I needed roughly 5 SOL to deploy the auction contract.
solana airdrop 5

# After successful deploy, a new Program Id will be printed to your terminal. Copy this
# and update the program's id everywhere in the code base. This way, during testing, we
# always call the version of the program we are testing instead of the stable one.
# DO NOT SKIP THIS STEP or you won't test your changes

# Next, comment out your js/packages/web/.env variables to force creation of a fresh new store

# Now start up the UI
cd ../js/packages
yarn && yarn bootstrap
yarn start

# Open the site in a browser in *incognito* mode http://localhost:3000

# In the incognito browser, create a new wallet by visiting https://sollet.io
# Copy the wallet address

# You'll need SOL added to the new wallet
solana airdrop 4 NEW_WALLET_ADDRESS

# Now visit the site (in incognito mode)
# Connect your new wallet
# Create a new store
# Test your program changes
```
