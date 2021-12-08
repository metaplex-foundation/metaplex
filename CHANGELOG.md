# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Note:** Version 0 of Semantic Versioning is handled differently from version 1 and above.
The minor version will be incremented upon a breaking change and the patch version will be
incremented for features.

## [Unreleased]

### Features

- Candy Machine now supports GIF, PNG and JPEG
- Added Token Entangler smart contract and CLI
- Add update authority command for candy machine
- Implemented NFT Packs Creation and Viewing Flow
- Display items redeemed when running Candy Machine Show command
- Ability to create auctions with any SPL-token mint by @JuanRdBO
- Condenses Instant Sale to be one buy button not by then claim.
- Add send_flp_tokens command to the Fair Launch CLI to mass airdrop FLP presale tokens.
- Add DNP, premade customs, and customized probabilities by type to generative art function in candy machine cli
- Cleanup and adding more CI testing.
- new CLI operation: `mint_tokens`
  - works the same as `mint_one_token`, but mints N tokens (has `--number` argument)
  - can be useful for testing devnet and pre-minting on mainnet
- new CLI operation: `get_all_mint_addresses`
  - prints out all mint addresses to console (might be worth saving the output to a file)
  - can be useful to integrate with marketplaces, which require all mint addresses (like Digital Eyes) or other batch operations
- updated CLI cache structure
  - It now includes image URLs next to metadata URLs
  - can be useful to integrate with rarity tools (like RarityMon, RaritySniper, etc)
- updated cache structure, now also includes the image URL
- DNP for image generation in the Candy Machine CLI
- If x then y probability for image generation in the Candy Machine CLI
- Ability to add premade customs to your image generation in the candy machine CLI
- Ability to use PSD instead of PNGs in the candy machine CLI
- Parallelize with batchSize command the candy machine CLI uploader
- Add ability for a candy machine owner to update existing candies using an old and new cache file
- Adds a minimum auction funds modal to prevent people from making bad auctions
- Implement NFT Packs Redeem
- Remove Websockets for useMeta
- Redirect to home and reload on auction creation

### Fixes

- Fixes - Hides spl token list if no tokens configured
- Fixes #840 - Claim button visible after claim.
- Improve Candy Machine CLI `create_generative_art` command performance. (@0xCryptoSheik in #899)
- Fixes an issue with Instant Sale when the auction is an english auction. By and claim buttons were broken.
- Fix flickering button state (myBidRedemption) and claim button state
- Fixes open sale button state issue
- Fix Undefined value in Current Sale UI
- Fix #830 - secondary sale flagging
- Fixes AUCTION_SIZE const
- Fixes #930
- Fixes Token Metadata Test Harness and lints rust code.
- When a token account already exists, punchTicket should not blow up in punch_and_refund_all_outstanding.
- Fix for punch ticket showing up as a button if you have an FLP presale token but didn't win. You should see Withdrawal.
- Fix wrong share value for creators
- Fix lint issues preventing CI from passing
- In Jares first useful contribution we see Jares second rust thing, refunding some millions $ back in unused candy configs to the authorities. Check 'withdraw' in the candy-machine-cli :)
- Fix build issues preventing CI from passing
- Remove unneeded code from Packs creation admin
- Fix issue where ata is not detected during ticket punching in FLP
- Fix issue where random shuffled array is not using in image generation
- Fix NFT Packs creation transaction failing when adding multiple items
- Fix layout on token selection
- Fix type of sale and edition number for non master edition NFTs

### Breaking

- Remove undocumented graphql package

## [1.0.0] - 2021-10-30

### Features

- N/A

### Fixes

- Fix massive version upgrade with a reversion from @Carthanas

### Breaking

- N/A
