---
title: Token Metadata Program
---

## Background

Solana's programming model and the definitions of the Solana terms used in this
document are available at:

- https://docs.solana.com/apps
- https://docs.solana.com/terminology

## Source

The Token Metadata Program's source is available on
[github](https://github.com/metaplex-foundation/metaplex)

There is also an example Rust client located at
[github](https://github.com/metaplex-foundation/metaplex/tree/master/rust/token-metadata/test/src/main.rs)
that can be perused for learning and run if desired with `cargo run --bin spl-token-metadata-test-client`. It allows testing out a variety of scenarios.

## Interface

The on-chain Token Metadata program is written in Rust and available on crates.io as
[spl-token-metadata](https://crates.io/crates/spl-token-metadata) and
[docs.rs](https://docs.rs/spl-token-metadata).

The crate provides four instructions, `create_metadata_accounts()`, `update_metadata_account()`, `create_master_edition()`, `mint_new_edition_from_master_edition_via_token(),` to easily create instructions for the program.

## Operational overview

This is a very simple program designed to allow metadata tagging to a given mint, with an update authority
that can change that metadata going forward. Optionally, owners of the metadata can choose to tag this metadata
as a master edition and then use this master edition to label child mints as "limited editions" of this master
edition going forward. The owners of the metadata do not need to be involved in every step of the process,
as any holder of a master edition mint token can have their mint labeled as a limited edition without
the involvement or signature of the owner, this allows for the sale and distribution of master edition prints.

## Operational flow for Master Editions

It would be useful before a dive into architecture to illustrate the flow for a master edition
as a story because it makes it easier to understand.

1. User creates a new Metadata for their mint with `create_metadata_accounts()` which makes new `Metadata`
2. User wishes their mint to be a master edition and ensures that there
   is only required supply of one in the mint.
3. User requests the program to designate `create_master_edition()` on their metadata,
   which creates new `MasterEdition` which for this example we will say has an unlimited supply. As
   part of the arguments to the function the user is required to make a new mint called the Printing mint over
   which they have minting authority that they tell the contract about and that the contract stores on the
   `MasterEdition`.
4. User mints a token from the Printing mint and gives it to their friend.
5. Their friend creates a new mint with supply 1 and calls `mint_new_edition_from_master_edition_via_token()`,
   which creates for them new `Metadata` and `Edition` records signifying this mint as an Edition child of
   the master edition original.

There is a slight variation on this theme if `create_master_edition()` is given a max_supply: minting authority
is locked within the program for the Printing mint and all minting takes place immediately in
`create_master_edition()` to a designated account the user provides and owns -
the user then uses this fixed pool as the source of their authorization tokens going forward to prevent new
supply from being generated in an unauthorized manner.

### Permissioning and Architecture

There are three different major structs in the app: Metadata, MasterEditions, and Editions. A Metadata can
have zero or one MasterEdition, OR can have zero or one Edition, but CANNOT have both a MasterEdition AND
an Edition associated with it. This is to say a Metadata is EITHER a master edition
or a edition(child record) of another master edition.

Only the minting authority on a mint can create metadata accounts. A Metadata account holds the name, symbol,
and uri of the mint, as well as the mint id. To ensure the uniqueness of
a mint's metadata, the address of a Metadata account is a program derived address composed of seeds:

```rust
["metadata".as_bytes(), program_id.as_ref(), mint_key.as_ref()]
```

A master edition is an extension account of this PDA, being simply:

```rust
["metadata".as_bytes(), program_id.as_ref(), mint_key.as_ref(), "edition".as_bytes()]
```

Any limited edition minted from this has the same address, but is of a different struct type. The reason
these two different structs(Edition and MasterEdition) share the same address is to ensure that there can
be no Metadata that has both, which would make no sense in the current architecture.

### create_metadata_account

(Mint authority must be signer)

This action creates the `Metadata` account.

### update_metadata_account

(Update authority must be signer)

This call can be called at any time by the update authority to update the URI on any metadata or
update authority on metadata, and later other fields.

### create_master_edition

(Update authority must be signer)

This can only be called once, and only if the supply on the mint is one. It will create a `MasterEdition` record.
Now other Mints can become Editions of this Metadata if they have the proper authorization token.

### mint_new_edition_from_master_edition_via_token

(Mint authority of new mint must be signer)

If one possesses a token from the Printing mint of the master edition and a brand new mint with no `Metadata`, and
that mint has only a supply of one, this mint can be turned into an `Edition` of this parent `Master Edition` by
calling this endpoint. This endpoint both creates the `Edition` and `Metadata` records and burns the token.

### Further extensions

This program is designed to be extended with further account buckets.

If say, we wanted to add metadata for youtube metadata, we could create a new struct called Youtube
and seed it with the seed

```rust
["metadata".as_bytes(), program_id.as_ref(), mint_key.as_ref(), "youtube".as_bytes()]
```

And then only those interested in that metadata need search for it, and its uniqueness is ensured. It can also
have it's own update action that follows a similar pattern to the original update action.
