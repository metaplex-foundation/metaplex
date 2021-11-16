# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Note:** Version 0 of Semantic Versioning is handled differently from version 1 and above.
The minor version will be incremented upon a breaking change and the patch version will be
incremented for features.

## [Unreleased]

### Features

- Added Token Entangler smart contract and CLI
- Add update authority command for candy machine
- Implemented NFT Packs Creation and Viewing Flow
- Display items redeemed when running Candy Machine Show command
- Ability to create auctions with any SPL-token mint by @JuanRdBO
- Condenses Instant Sale to be one buy button not by then claim.
- Add send_flp_tokens command to the Fair Launch CLI to mass airdrop FLP presale tokens.
- Add DNP, premade customs, and customized probabilities by type to generative art function in candy machine cli

### Fixes

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

### Breaking

- Remove undocumented graphql package

## [1.0.0] - 2021-10-30

### Features

- N/A

### Fixes

- Fix massive version upgrade with a reversion from @Carthanas

### Breaking

- N/A
