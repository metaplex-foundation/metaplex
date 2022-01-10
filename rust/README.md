# Metaplex Rust Programs

The Rust programs for each contract used to live here but have been moved.

## Where are those programs now?

The Rust programs of all actively maintained Metaplex contracts were moved to the
[metaplex-program-library][mpl]. They are stored there alongside their respective SDK.

All programs of deprecated contracts were moved to the [a separate repository][deprecated]
_aka_ the graveyard and are no longer maintained..

## Why were the programs moved?

We at Metaplex determined that moving contracts into a separate repository and having the Rust
programs live alongside the client SDK is necessary to allow us to stabilize our contracts and
evolve them quickly and securely.

Structuring Solana contracts like this is a rather standard approach and demonstrated by the
[solana program library][spl] which most of us are familiar with.

This approach provides the following benefits:

- aside from lower level Rust tests, integration tests can be easily authored using the SDK
  that lives in the same repo
- SDK and Rust program code can be changed and tested together and those changes can be
  provided in _one_ pull request in _one_ repository
- CI workflows can be setup for those tests and will run for each pull request which ensures that
  changes that are merged don't break existing functionality in either the program or the SDK
- pull requests are now clearly scoped to either the frontend app (this repository) or the
  underlying contracts (the [metaplex-program-library][mpl]) which aids in reviewing them and
  paying particular attention to contract changes as those form the core of the Metaplex
  functionality

As a result this not only improves security but also the experience of Metaplex users and
developers.

## Which Contracts were deprecated?

- NFT Candy Machine v1
- Fair Launch 

**NOTE** that deprecated programs will stay available on-chain and are stored as _readonly_
inside the [deprecated contracts repository][deprecated].

## What are the Future Plans for this Repository?
 
In the near future the [metaplex repository][metaplex] will become an example
of how to use the SDK provided by the [metaplex-program-library][mpl] in order to build
applications with Metaplex.

## I want to change contract SDK or Rust program code, where do I pull request?

First make sure that the contract has not been deprecated and then add those changes inside the
respective folder of the [metaplex-program-library][mpl] repository. Make sure to add tests
that show that additions/fixes work.

If you make changes to the SDK add an integration test.

If you add/change API of a Rust program also update the respective SDK and add an integration
test showing that it works end to end.

**NOTE**: for deprecated programs found inside the [deprecated
repository][deprecated] no changes will be accepted

## I want to change the store front app, where do I pull request?

Changes to the React code should still be provided via a pull request in this repository as
before.
Please be aware though that it will eventually see a major rewrite to use the SDK provided by
the [metaplex program library][mpl] as stated above. Thus we may choose to hold off on
merging features that aren't essential to most of our users and focus on merging fixes instead.

[mpl]:https://github.com/metaplex-foundation/metaplex-program-library
[spl]:https://github.com/solana-labs/solana-program-library
[metaplex]:https://github.com/metaplex-foundation/metaplex
[deprecated]:https://github.com/metaplex-foundation/the-graveyard
