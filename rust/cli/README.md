[![build status](https://github.com/CalebEverett/metaplex/actions/workflows/rust-cli.yml/badge.svg)](https://github.com/CalebEverett/metaplex/actions/workflows/rust-cli.yml)


## Metaplex Command Line Interface

This is a starting point to develop command line applications that interact with the metaplex programs. It includes output features and cli tooling from the [Solana token program cli](https://github.com/solana-labs/solana-program-library/tree/master/token/cli/src), including the ability to produce output for display or json, either normal or compact, and use default values from solana-cli local config. Also makes use of [solana-clap-utils](https://github.com/solana-labs/solana/tree/master/clap-utils) for efficient validation and argument parsing.

### Implemented commands

* `mint-info`: display information for an existing mint account.
* `create-metadata`: create a new metadata account for an existing mint, including creators and shares.
* `metadata-info`: dispaly information for an existing metadata account.

### Getting Started

1. `cd rust/cli`
2. `cargo build`
3. `cargo run -- -help`

### Todo
1. Build out remaining commands for full featured metaplex cli.
2. Remove `create-token` and `supply` commands - leaving in for now to serve as templates for other commands