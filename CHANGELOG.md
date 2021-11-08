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

### Fixes

- Fixes #840 - Claim button visible after claim.
- Improve Candy Machine CLI `create_generative_art` command performance. (@0xCryptoSheik in #899)
- Fixes an issue with Instant Sale when the auction is an english auction. By and claim buttons were broken.

### Breaking

- N/A

## [1.0.0] - 2021-10-30

### Features

- N/A

### Fixes

- Fix massive version upgrade with a reversion from @Carthanas

### Breaking

- N/A
