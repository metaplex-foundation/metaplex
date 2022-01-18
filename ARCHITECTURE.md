# Metaplex Developer Guide

# Architecture

## Overview

Metaplex is actually not a single contract, but a contract ecosystem, consisting of four contracts that interact with one another. Only one of the contracts (Metaplex) actually knows about the other three, while the others represent primitives in the ecosystem and do not interact with each other at all. First, we'll go over what each contract does at a glance, and then we'll cover the full life cycle of a token becoming an NFT and getting auctioned to see the ecosystem in action. Following that will be modules for each contract.

## The Contracts

### Token Metadata

This is the bedrock contract of the entire ecosystem. All that you need to interact with it is your own mint for which you have the mint authority. It is primarily a "mint decorator." It allows you to decorate your mint with a Metadata PDA that gives it a name, symbol, uri, list of creators with royalty splits, and whether or not it's been sold. You can do this with any mint with any supply. Phantom Wallet uses this Metadata account and it's URI field, which often links to a Manifest.json file of a certain format, to display NFTs in their Collections category on their UI.

Furthermore, if your mint has one token in its supply, you can give it an additional decoration PDA, of type MasterEdition. This PDA denotes the mint as a special type of object that can mint other mints - which we call Editions (as opposed to MasterEditions because they can't print other mints themselves). This makes this mint like the "master records" that record studios used to use to make new copies of records back in the day. The MasterEdition PDA will take away minting and freezing authority from you in the process and will contain information about total supply, maximum possible supply, etc.

The existence of Metadata and its sister PDA MasterEdition makes a very powerful combination for a mint that enables the entire rest of the Metaplex contract stack. Now you can create:

- Normal mints that just have names (Metadata but no MasterEdition)
- One of a kind NFTs (Metadata + MasterEdition with `max_supply` of 0)
- NFTs that can print limited edition child NFTs (Metadata + MasterEdition with `max_supply` of say 10)
- NFTs that can print unlimited open edition NFTs (Metadata + MasterEdition with unlimited `max_supply`)

You can also easily transfer ownership of these PDA records with the `updateAuthority` key on Metadata between parties, so you can sell printing rights to another party, or just give them the token itself while retaining the printing rights.

### Token Vault

Token Vault acts like a corporation or safe escrow for arbitrary token allotments. You can create a vault object, and insert any number of tokens from any number of mints into safety deposit boxes, and then activate the vault. It has a few different states, but the important ones are **Activated**, which is when it's locked and nobody can access its contents, and **Combined,** when the vault has essentially been opened and the vault authority can withdraw the contents.

Going from **Activated** to **Combined** has only one restraint - that there are no outstanding fractional shares in circulation. You can in principle go straight from **Activated** to **Combined** immediately if you issue 0 fractional shares (which is what the Metaplex front-end contract does during Auction creation).

Once the vault is **Activated**, you can then mint treasury shares that represent fractional ownership of the tokens inside the vault. The treasury shares are valued based on an external price indicator account that does not need to be owned by the vault and is considered the vault's price oracle, and these shares can then be sold on a dex or in an AMM or whatever you desire. This allows you, as the vault owner, to take your NFT(s) and turn them into a sort of corporation and sell partial ownership to other parties. If the external price oracle has its price driven by a proper third party such as a dex or other price discovery mechanism, then the entire system is balanced.

When there are outstanding shares, you cannot, as the vault owner, **Combine** the vault, and retrieve your tokens, until you buy out the shares in circulation. You have to provide the number_of_shares_outstanding*price_from_oracle in the token_mint of the vault to the vault to unlock it. Then shareholders can return at their leisure to trade in shares for their winnings.

### Auction

The Auction Contract represents an auction primitive, and it knows nothing about NFTs, or Metadata, or anything else in the Metaplex ecosystem. All it cares about is that it has a resource address, it has auction mechanics, and it is using those auction mechanics to auction off that resource. It currently supports English Auctions and Open Edition Auctions (no winners but bids are tracked.) Its only purpose is to track who won what place in an auction and to collect money for those wins. When you place bids, or cancel them, you are interacting with this contract. However, when you redeem bids, you are not interacting with this contract, but Metaplex, because while it can provide proof that you did indeed win 4th place, it has no opinion on how the resource being auctioned off is divvied up between 1st, 2nd, 3rd, and 4th place winners, for example.

This contract will be expanded in the future to include other auction types, and better guarantees between that the auctioneer claiming the bid actually has provided the prize by having the winner sign a PDA saying that they received the prize. Right now this primitive contract should *not* be used in isolation, but in companionship with another contract (like Metaplex in our case) that makes such guarantees that prizes are delivered if prizes are won.

### Metaplex

This is the granddaddy contract of them all. The primary product of the Metaplex contract are AuctionManagers, and they are the nexus of the other three contract's structs. The purpose of an AuctionManager is to understand that an Auction object is auctioning off the contents of a Vault, and that the contents of a Vault are different types of NFT arrangements, such as:

- Limited Edition Prints (Printing a new child edition from limited supply)
- Open Edition Prints (Printing a new child edition from unlimited supply)
- Full Rights Transfers (Giving away token + metadata ownership)
- Single Token Transfers (Giving away a token but not metadata ownership)

It orchestrates disbursements of those contents to winners of an auction. An AuctionManager requires both a Vault and an Auction to run, and it requires that the Auction's resource key be set to the Vault.

Due to each type of NFT transfer above requiring slightly different nuanced handling and checking, Metaplex handles knowing about those things, and making the different CPI calls to the Token Metadata contract to make those things happen as required during the redemption phase. It also has full authority over all the objects like Vault and Auction, and handles all royalties payments by collecting funds from the auction into its own central escrow account and then disbursing to artists.

## Basic Single Item Auction End To End

Now that we've gone over the contracts, let's run through an example of how the contracts interact to create an NFT and sell it. I personally find these stories the most informative way to learn a new ecosystem.

1. You allocate space for a mint account and a token account using Solana's system command and then you use spl-token JS SDK `createMint` and `createTokenAccount` commands to create a new mint and a new token account of that mint. You then use the `mintTo` command to mint a single token to that token account.
2. You now want to label this token account as a MasterEdition NFT that has a limited supply of 10 possible Limited Edition Prints. Cool! To begin with, you make a call to the Token Metadata's `create_metadata_account` endpoint, naming it the "Bob's Cool NFT" mint with symbol "BOB" and you pass in a link to a picture of your Uncle Bob for the URI. This command creates a Metadata account with a PDA seed of `['metadata', metadata_program_id, your_mint_id]` relative to the `metadata_program_id`.

    Note that the flow on the front end is a bit different - we put a dummy URI in place during this call, just to get the mint and metadata made, so that we can then push these values up to Arweave. Then we take the Arweave URL, and do a follow-up update_metadata_account call to update the Metadata with a proper URI that points to the metadata on the Arweave chain. It's a chicken-or-egg problem work-around because we need to have the Metadata existing to put it on Arweave, but we need the Arweave URI to place it in the Metadata. We simplify the case for this example.

3. Next up, you need to turn this normal run of the mill NFT into a Master Edition. Right now you can still mint any number of tokens as you retain minting authority. The point of Metadata is to label mints - not just NFTs. So you call the create_master_edition endpoint on the Token Metadata contract which takes minting authority away from you, and creates a new Master Edition pda that contains information about how large a supply you want to have.

    When you want to mint Editions now, you'll need to present a token account containing the token from this Master Edition mint as proof of ownership and authority to do so. This is why we will later hand this token over to the Auction Manager, so that it can do the same to print off Editions for winners!

4. Now that your token account has a bonafide NFT Master Edition in it, we can run an auction where we auction off Limited Edition prints! Let's say we want to auction off three such prints.
5. Next, we create a token vault using the `init_vault` endpoint of the token vault contract. We'll store our master edition token in it by adding it to the vault using the `add_token_to_inactive_vault` endpoint. This will create a safety deposit box in the vault that contains the the token.
6. Then we will call the `activate_vault` command which **Activates** the vault, locking everything inside.
7. We now **Combine** the vault using `combine_vault`, which is to say, we "open it," so the current authority could if they wanted withdraw the tokens inside it. The Auction Manager can only work with vaults in this state, which is why we have to go through the **Activation** phase to get here even though it seems a little nonsensical. See the in depth guide for more color on why these different states exist.
8. Next up, we create the auction, and we say its resource is this vault. The auction has not yet been started, but it has the right resource (the vault). We do this via the `create_auction` command on the Auction contract.
9. Now that we have an auction and a vault, we can go and call the `init_auction_manager` endpoint on the Metaplex contract with both of these accounts among a few others to create an AuctionManager, which ties them both together. Note that `init_auction_manager` takes a special struct called AuctionManagerSettings that allows one to specify how many winners there are and what winners get which items from which safety deposit box. At this point, we can't yet start the auction. The AuctionManager is in an invalidated state and we need to validate it by validating that the safety deposit boxes we provided to it in the vault are actually what we said are in them when we provided the AuctionManager with it's settings struct.
10. Before we begin validation, we call `set_authority` on both the vault and auction to change its authority to the auction manager, so that it has control over both of those structs. This is a requirement for the validation phase and the rest of the contract lifecycle. **Now you no longer have control over your items.**
11. We call the `validate_safety_deposit_box` endpoint on the Metaplex contract with the one safety deposit box in the vault, and the logic in this endpoint checks that there are exactly 3 printing tokens from the right mint in this box, matching the 3 printing tokens we promised it would have in our AuctionManagerSettings. Once we do this, and because this is the only safety deposit box in the vault, the AuctionManager is now validated.
12. We now call `start_auction` on the Metaplex contract, which, because the AuctionManager has authority over the Auction, calls `start_auction` on the Auction contract, and the auction begins!
13. Users can go and call `place_bid` on the Auction contract to place bids. When they do this, tokens of the `token_mint` type used by the auction are taken from the account they provide, tied to their main wallet, and stored in bidder pot accounts in the auction contract.
14. In order to update a bid, a user must first cancel the original bid, and then place a new bid.
15. Once the auction is over, a user can refund their bid if they did not win by calling `cancel_bid` again. Winners of the auction cannot cancel their bids.
16. The winner of a bid creates a mint with decimals 0, a token account with 1 token in it, and calls the `redeem_printing_v2_bid` endpoint on the Metaplex contract, all in a single transaction. This token is now *officially* a Limited Edition of the "Bob's Cool NFT" Master Edition NFT!
17. You, the auctioneer, visits /#/auction/id/billing and hit the settle button. This first iterates over all three bidders and for each wallet used, calls `claim_bid` on the Metaplex contract, which proxy-calls a `claim_bid` on the Auction contract, telling it to dump the winner's payment into an escrow account called `accept_payment` on the AuctionManager struct. It has the same token type as the auction. Once all payments have been collected, the front end then calls the `empty_payment_account` endpoint one time (since you are the only creator on the Metadata being sold) and the funds in this escrow are paid out to a token account provided of the same type owned by you.

    Note that our front end reference implementation uses SOL as the "token type." This has some special caveats, namely that SOL isn't really an "spl token." It instead has a work-around called the "Wrapped SOL mint." This is a special mint that is often used in a transient account. What this means is that when we place a bid, we actually make a one-off system account, transfer lamports to it of your bid amount + rent, then label it an spl-token account of the wrapped sol type, use it to place the bid, then close it all in one transaction.

    Special machinations in the spl token program then make this wrapped sol token account have a number of tokens with the proper decimals that map to the amount of SOL you transferred to it. We do a similar operation with cancelling, where we make a transient wrapped sol account, transfer cancelled bid funds to it, and then close the account, transferring funds out all in a single transaction. This is all done for ease of use. With settlements, when funds are disbursed to artists, we actually make a WSOL account for them and they have to close it by hand via a dropdown menu.

    The protocol operates off of generic spl tokens and has no opinions about WSOL specifically, but the front end reference implementation does. So take careful note!

## Conclusion

Now that you've been given this architectural overview, we'll follow up with specific in-depth break downs of each contract's state and mechanics. Hopefully you've got a better idea now of how they work together. If you have any further questions, you can always reach out to me, j_, on discord, or my twitter handle, @redacted_j. My partner in crime, b_, who helped build this protocol, can also be reached on twitter at @baalazamon. This was his brainchild and I couldn't have done it without him. He's been a good friend and an even better mentor.

# Deep Dive

Get ready and grab some aspirin. Here we go!

## Token Metadata Contract

### Overview

The Token Metadata contract can be used for storing generic metadata about any given mint, whether NFT or not. Metadata allows storage of name, symbol, and URI to an external resource. Additionally, the Metadata allows for the tracking of creators, primary sales, and seller fees. Once the mint has been created, the mint authority can use the SPL Metadata program to create metadata as described in this document.

Minting an NFT requires creating a new SPL Mint with the supply of one and decimals zero as described [https://spl.solana.com/token#example-create-a-non-fungible-token](https://spl.solana.com/token#example-create-a-non-fungible-token)

Below is the Rust representation of the structs that are stored on-chain.

```rust

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct Data {
    /// The name of the asset
    pub name: String,
    /// The symbol for the asset
    pub symbol: String,
    /// URI pointing to JSON representing the asset
    pub uri: String,
    /// Royalty basis points that goes to creators in secondary sales (0-10000)
    pub seller_fee_basis_points: u16,
    /// Array of creators, optional
    pub creators: Option<Vec<Creator>>,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct Metadata {
    pub key: Key,
    pub update_authority: Pubkey,
    pub mint: Pubkey,
    pub data: Data,
    // Immutable, once flipped, all sales of this metadata are considered secondary.
    pub primary_sale_happened: bool,
    // Whether or not the data struct is mutable, default is not
    pub is_mutable: bool,
}

#[repr(C)]
#[derive(Clone, Debug, PartialEq, BorshSerialize, BorshDeserialize)]
pub struct MasterEdition {
    pub key: Key,

    pub supply: u64,

    pub max_supply: Option<u64>,
}

#[repr(C)]
#[derive(Clone, Debug, PartialEq, BorshSerialize, BorshDeserialize)]
/// All Editions should never have a supply greater than 1.
/// To enforce this, a transfer mint authority instruction will happen when
/// a normal token is turned into an Edition, and in order for a Metadata update authority
/// to do this transaction they will also need to sign the transaction as the Mint authority.
pub struct Edition {
    pub key: Key,

    /// Points at MasterEdition struct
    pub parent: Pubkey,

    /// Starting at 0 for master record, this is incremented for each edition minted.
    pub edition: u64,
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct Creator {
    pub address: Pubkey,
    pub verified: bool,
    // In percentages, NOT basis points ;) Watch out!
    pub share: u8,
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Debug, Clone)]
pub struct EditionMarker {
    pub key: Key,
    pub ledger: [u8; 31],
}

```

The instruction set for the token metadata contract can be found here: https://github.com/metaplex-foundation/metaplex-program-library/blob/master/token-metadata/program/src/instruction.rs

### Types

### Metadata

This object can be used to provide basic info about SPL tokens on Solana, which include the name, symbol, URI and seller fees, as well as whether or not the sale of this metadata has happened yet. Anybody carrying a token from this mint can mark this primary sale as having happened via the `update_primary_sale_happened_via_token` command. There is obviously no incentive for a primary owner to do this as it precludes them from getting full royalties on the first sale, but a secondary owner must do this if they ever want to see fees from selling!

Metadata accounts are simply PDA addresses with derived key of `['metaplex', metaplex_program_id, mint_id]`.

### Master Edition

In addition to simple metadata, a Master Edition object can be created. Master Editions act similar to a token mint and allows the holder to create new number editions while tracking provenance of the items. A Master Edition token, when minted, represents both a non-fungible token on Solana and metadata that allows creators to control the provenance of prints created from the master edition. A Master Edition object can only be created for mints with supply of one and decimals of zero.

The creator can set the maximum supply of the master edition just like a regular mint on Solana, with the main difference being that each print is a numbered edition created from it. To mint a new limited edition, this master edition token must be presented, along with a new mint + token, to the `mint_new_edition_from_master_edition_via_token` endpoint.

Master Edition accounts are PDA addresses of `['metaplex', metaplex_program_id, mint_id, 'edition']`.

### Edition

An edition represents a copy of an NFT, and is created from a Master Edition. Each print has an edition number associated with it.  Normally, prints can be created during Open Edition or Limited Edition auction, but they could also be created by the creator manually.

Editions are created by presenting the Master Edition token, along with a new mint that lacks a Metadata account and a token account containing one token from that mint to the `mint_new_edition_from_master_edition_via_token` endpoint. This endpoint will create both an immutable Metadata based on the parent Metadata and a special Edition struct based on the parent Master Edition struct.

The Edition has the same PDA as a Master Edition to force collision and prevent a user from having a mint with both, `['metaplex', metaplex_program_id, mint_id, 'edition']`.

## Concepts

### Decoration as PDA Extensions

The whole idea of the Token Metadata program is to be a decorator to a Token Mint. Each struct acts as further decoration. The Metadata struct gives a mint a name and a symbol and points to some external URI that can be anything. The Master Edition gives it printing capabilities. The Edition labels it as a child of something.

This is important to internalize, because it means you as a Rust developer can take it a step further. There is nothing stopping you from building a new contract on top of ours that makes it's own PDAs and and extending this still further. Why not build a CookingRecipes PDA, that has seed `['your-app', your_program_id, mint_id, 'recipes']`? You can require that a Metadata PDA from our contract exists to make a PDA in your program, and then you can further decorate mints on top of our decorations. The idea is to compose mints with further information than they ever had before, and then build clients that can consume that information in new and interesting ways.

### Co-Creators

The SPL Metadata program supports storing up to five co-creators that share potential future profits from sales for the items as defined by `seller_fee_basis_points` . Each creator needs to be added as part of the minting process and is required to approve metadata that was used in his name using the `sign_metadata` endpoint. Unverified artwork cannot be sold with Metaplex.

During the first sale, creators share in 100% of the proceeds, while in follow up sales, they share in proceeds as a percentage determined by `seller_fee_basis_points`. Whether or not a metadata is considered in second sale or not is determined by the `primary_sale_happened` boolean on the Metadata account.

### URI JSON Schema

The URI resource is compatible with [ERC-1155 JSON Schema](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1155.md#erc-1155-metadata-uri-json-schema) in order to easily port NFTs across different chains using the wormhole bridge.  You can see how we build this in our reference implementation here: [https://github.com/metaplex-foundation/metaplex/blob/master/js/packages/web/src/actions/nft.tsx#L66](https://github.com/metaplex-foundation/metaplex/blob/master/js/packages/web/src/actions/nft.tsx#L66)

```jsx
{
    "title": "Token Metadata",
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
            "description": "Identifies the asset to which this token represents"
        },
        "description": {
            "type": "string",
            "description": "Describes the asset to which this token represents"
        },
        "image": {
            "type": "string",
            "description": "A URI pointing to a resource with mime type image/* representing the asset to which this token represents. Consider making any images at a width between 320 and 1080 pixels and aspect ratio between 1.91:1 and 4:5 inclusive."
        },
				"external_url": {
            "type": "string",
            "description": "A URI pointing to an external resource that will take user outside of the platform."
        },
				"seller_fee_basis_points": {
						"type": "number",

				},
        "properties": {
            "type": "object",
            "description": "Arbitrary properties. Values may be strings, numbers, object or arrays.",
				    "properties": {
								"creators": {
										"type": "array",
										"description": "Contains list of creators, each with Solana address and share of the nft"
								},
						}
        }
    }
}
```

## Token Vault

### Overview

The Token Vault serves two purposes in the Metaplex ecosystem: Storing tokens for safe-keeping for the Auction Manager, and as a fractionalization service for NFTs. It has two primary concepts, that of the Vault and of the Safety Deposit Box. A Vault can have any number of Safety Deposit Boxes, one per unique mint being stored. A Vault goes through many phases in life-cycle, but the two important ones are when it's **Activated** and when it is **Combined**. When it is **Activated**, new fractional shares can be minted and distributed for partial ownership, and when it is **Combined**, fractional owners can burn their shares in exchange for remuneration and the vault authority can retrieve the stored tokens in the Vault.

Below is the Rust state stored on chain:

```rust
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq)]
pub enum Key {
    Uninitialized,
    SafetyDepositBoxV1,
    ExternalAccountKeyV1,
    VaultV1,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq)]
pub enum VaultState {
    Inactive,
    Active,
    Combined,
    Deactivated,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct Vault {
    pub key: Key,
    /// Store token program used
    pub token_program: Pubkey,
    /// Mint that produces the fractional shares
    pub fraction_mint: Pubkey,
    /// Authority who can make changes to the vault
    pub authority: Pubkey,
    /// treasury where fractional shares are held for redemption by authority
    pub fraction_treasury: Pubkey,
    /// treasury where monies are held for fractional share holders to redeem(burn) shares once buyout is made
    pub redeem_treasury: Pubkey,
    /// Can authority mint more shares from fraction_mint after activation
    pub allow_further_share_creation: bool,

    /// Must point at an ExternalPriceAccount, which gives permission and price for buyout.
    pub pricing_lookup_address: Pubkey,
    /// In inactive state, we use this to set the order key on Safety Deposit Boxes being added and
    /// then we increment it and save so the next safety deposit box gets the next number.
    /// In the Combined state during token redemption by authority, we use it as a decrementing counter each time
    /// The authority of the vault withdrawals a Safety Deposit contents to count down how many
    /// are left to be opened and closed down. Once this hits zero, and the fraction mint has zero shares,
    /// then we can deactivate the vault.
    pub token_type_count: u8,
    pub state: VaultState,

    /// Once combination happens, we copy price per share to vault so that if something nefarious happens
    /// to external price account, like price change, we still have the math 'saved' for use in our calcs
    pub locked_price_per_share: u64,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct SafetyDepositBox {
    // Please note if you change this struct, be careful as we read directly off it
    // in Metaplex to avoid serialization costs...
    /// Each token type in a vault has it's own box that contains it's mint and a look-back
    pub key: Key,
    /// Key pointing to the parent vault
    pub vault: Pubkey,
    /// This particular token's mint
    pub token_mint: Pubkey,
    /// Account that stores the tokens under management
    pub store: Pubkey,
    /// the order in the array of registries
    pub order: u8,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize)]
pub struct ExternalPriceAccount {
    pub key: Key,
    pub price_per_share: u64,
    /// Mint of the currency we are pricing the shares against, should be same as redeem_treasury.
    /// Most likely will be USDC mint most of the time.
    pub price_mint: Pubkey,
    /// Whether or not combination has been allowed for this vault.
    pub allowed_to_combine: bool,
}

```

The instruction set for the vault can be found here: [https://github.com/metaplex-foundation/metaplex/blob/master/rust/token-vault/program/src/instruction.rs](https://github.com/metaplex-foundation/metaplex/blob/master/rust/token-vault/program/src/instruction.rs)

### Types

### Vault

The Big Kahuna and namesake of this contract, the Vault is really a container of many concepts. The Vault can be used without any fractional share emissions as a kind of escrow service for many different tokens of different mint types, and indeed, this is what Metaplex uses it for when performing Auctions. However it can also be used to provide partial ownership of NFTs to interested investors. Let's break down the keys in the Vault's state one by one.

**Fractional shares:** It points at a `fractional_mint` and `fractional_treasury`, which allows the vault authority to mint new fractional shares to a treasury account before (or optionally after) **Activation** of the vault. Shares inside the treasury don't count towards the cost of **Combining** the vault.

**Redeem treasury:** This account is used to hold in escrow the funds used to pay off fractional shareholders when the vault authority wishes to **Combine** the vault and regain possession of the stored assets inside. The vault authority has to pay shares_in_circulation*price_of_shares into this redeem treasury. The mint of the treasury is completely decidable by the vault authority, we make no opinions on that.

**Pricing Lookup Address:** This is a pointer to an ExternalLookupAccount, which while its struct is defined by the Token Vault program, the account itself does not need to be owned by the vault program or anything within it. It is meant to be an external pricing oracle that is independent of the vault authority or vault that provides pricing data on the fractional share price so that the fractional share owners get a fair buyout by the vault authority.

Token Vaults do not have PDA addresses.

### Safety Deposit Box

A safety deposit box keeps track of the token account containing the tokens, its vault, and what order in the vault it maintains. If it was inserted 3rd, it's order is 2 (0-based.) It's a pretty simple setup. And yes, you should be aware the safety deposit box doesn't *actually* store any tokens - it contains a `store` key that points to an spl-token account that contains the tokens. It's more of a foreign key join table between the vault and the store.

Safety Deposit Boxes always have PDA addresses of type `['vault', vault_key, mint_key]`.

### External Price Account

The External Price Account is meant to be used as an external oracle. It is provided to a Vault on initialization and doesn't need to be owned or controlled by the vault authority (though it can be.) It can provide data on the `price_per_share` of fractional shares, whether or not the vault authority is currently allowed to **Combine** the vault and reclaim the contents, and what the `price_mint` of the vault is.

ExternalPriceAccounts do not have PDA addresses.

## Concepts

### Vault State Machine

A Vault begins its journey in the **Inactive** state. It is in this state that tokens can be added, and fractional shares can be minted into the fractional treasury. The idea is this phase is the "prep" where we are getting the Vault ready for use as an escrow or as a holding corporation for fractional ownership of NFTs.

Once the vault is **Activated**, the Vault is closed, and the vault authority may *not* remove the tokens from the Vault. Furthermore, no new fractional shares may be minted unless during initialization the special `allow_further_share_creation` boolean was set. Some fractional share owners may not be too enthused about buying into a vault only to be diluted later, so we make this a one-time thing during initialization where the vault authority gets to choose what kind of vault it gets to be. The vault authority *can* however, remove shares from the treasury and give them to whomever they want, or start a dex with them, or an AMM, or what have you. These shares represent partial ownership of the vault now!

Let's now say that the vault authority now wants to regain access to the Vault's contents. To do this, first, the ExternalPriceAccount tied to the vault needs to have `allowed_to_combine` set to true. If this is the case, the vault authority can then **Combine** the Vault, providing a token account with enough tokens to pay off all outstanding fractional share holders to the Vault. The Vault will drain this account to the `redeem_treasury` and the Vault will move to the **Combined** state. The Vault will use the `price_per_share` on the ExternalPriceAccount for this calculation. If no shares are outstanding, this **Combination** operation is free. During **Combination**, the vault authority also has the option to transmit vault authority to a new authority. Also note that all shares remaining in the fractional treasury are burned in this step.

Once **Combined**, the Vault's contents can now be emptied by the vault authority, and fractional share owners can redeem (and burn) their fractional share tokens for tokens from the `redeem_treasury`. When all tokens in all safety deposit boxes have been removed, and all fractional tokens have been burned, the Vault will automatically move to the **Deactivated** state.

## Auction

### Overview

The Auction contract is a primitive that is meant to be used in conjunction with another smart contract that understands the context of the resource for which the auction is being held. It contains mechanics for collecting payment from bidders, for keeping track of a winners list, and handling bid placement and cancellation, but it has no opinions on what the resource being bid on should be, or how it gets divided.

While it currently has support for English Auctions and Open Edition Auctions, it will in the future support other types of auctions such as Vickrey and Dutch Auctions. The state for the contract is reproduced here:

```rust
/// Structure with pricing floor data.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub enum PriceFloor {
    /// Due to borsh on the front end disallowing different arguments in enums, we have to make sure data is
    /// same size across all three
    /// No price floor, any bid is valid.
    None([u8; 32]),
    /// Explicit minimum price, any bid below this is rejected.
    MinimumPrice([u64; 4]),
    /// Hidden minimum price, revealed at the end of the auction.
    BlindedPrice(Hash),
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub struct AuctionData {
    /// Pubkey of the authority with permission to modify this auction.
    pub authority: Pubkey,
    /// Pubkey of the resource being bid on.
    /// TODO try to bring this back some day. Had to remove this due to a stack access violation bug
    /// interactin that happens in metaplex during redemptions due to some low level rust error
    /// that happens when AuctionData has too many fields. This field was the least used.
    ///pub resource: Pubkey,
    /// Token mint for the SPL token being used to bid
    pub token_mint: Pubkey,
    /// The time the last bid was placed, used to keep track of auction timing.
    pub last_bid: Option<UnixTimestamp>,
    /// Slot time the auction was officially ended by.
    pub ended_at: Option<UnixTimestamp>,
    /// End time is the cut-off point that the auction is forced to end by.
    pub end_auction_at: Option<UnixTimestamp>,
    /// Gap time is the amount of time in slots after the previous bid at which the auction ends.
    pub end_auction_gap: Option<UnixTimestamp>,
    /// Minimum price for any bid to meet.
    pub price_floor: PriceFloor,
    /// The state the auction is in, whether it has started or ended.
    pub state: AuctionState,
    /// Auction Bids, each user may have one bid open at a time.
    pub bid_state: BidState,
}

// Further storage for more fields. Would like to store more on the main data but due
// to a borsh issue that causes more added fields to inflict "Access violation" errors
// during redemption in main Metaplex app for no reason, we had to add this nasty PDA.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub struct AuctionDataExtended {
    /// Total uncancelled bids
    pub total_uncancelled_bids: u64,
    // Unimplemented fields
    /// Tick size
    pub tick_size: Option<u64>,
    /// gap_tick_size_percentage - two decimal points
    pub gap_tick_size_percentage: Option<u8>,
    /// auction name
    pub name: Option<[u8; 32]>,
}

/// Define valid auction state transitions.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub enum AuctionState {
    Created,
    Started,
    Ended,
}

/// Bids associate a bidding key with an amount bid.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub struct Bid(pub Pubkey, pub u64);

/// BidState tracks the running state of an auction, each variant represents a different kind of
/// auction being run.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub enum BidState {
    EnglishAuction { bids: Vec<Bid>, max: usize },
    OpenEdition { bids: Vec<Bid>, max: usize },
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub enum WinnerLimit {
    Unlimited(usize),
    Capped(usize),
}

/// Models a set of metadata for a bidder, meant to be stored in a PDA. This allows looking up
/// information about a bidder regardless of if they have won, lost or cancelled.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub struct BidderMetadata {
    // Relationship with the bidder who's metadata this covers.
    pub bidder_pubkey: Pubkey,
    // Relationship with the auction this bid was placed on.
    pub auction_pubkey: Pubkey,
    // Amount that the user bid.
    pub last_bid: u64,
    // Tracks the last time this user bid.
    pub last_bid_timestamp: UnixTimestamp,
    // Whether the last bid the user made was cancelled. This should also be enough to know if the
    // user is a winner, as if cancelled it implies previous bids were also cancelled.
    pub cancelled: bool,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct BidderPot {
    /// Points at actual pot that is a token account
    pub bidder_pot: Pubkey,
    /// Originating bidder account
    pub bidder_act: Pubkey,
    /// Auction account
    pub auction_act: Pubkey,
    /// emptied or not
    pub emptied: bool,
}

```

The instruction set for auction can be found here: [https://github.com/metaplex-foundation/metaplex/blob/master/rust/auction/program/src/instruction.rs](https://github.com/metaplex-foundation/metaplex/blob/master/rust/token-vault/program/src/instruction.rs)

### Types

### AuctionData

This is the core data representing an auction in this program. It contains (almost) all of the configuration representing an auction. You'll notice that it has a `token_mint` field which means any spl_token can be used as the base mint for an auction, so you can bid in any currency! It also keeps track of a few other goodies, so let's break them down one by one:

`last_bid`: Every time someone bids, this is set. Useful for doing math with the gap time feature.

`ended_at` : This is when the auction actually will end or has ended. It can be set at any time.

`end_auction_at` : This is actually a duration and is a little confusing. If you're planning to start your auction at a later point in time, you can set this as a duration, and when you finally start your auction, ended_at will be set to now + this duration. Useful, right? Maybe poorly named. Our bad.

`end_auction_gap` : Used in conjunction with `last_bid` - if this is set to 1 minute, then let's say someone makes a bid in the last 5 seconds of an auction. The auction is then extended by 55 seconds from it's original end time (+ 1 minute from the last bid.) If someone then makes another bid within that time period, it's another + 1 minute from that bid. And so on.

`price_floor` : Various options for price floor, but essentially you can use this to set no price floor, a minimum price floor, or a blind price floor on the auction. See the enum for more.

AuctionData accounts always have PDA addresses of `['auction', auction_program_id, resource_id]` where `resource_id` is the thing being auctioned off and `auction_program_id` is the id of the auction contract.

### Bid State

Bid State is technically not a top level struct, but an embedded one within AuctionData. I thought it was good to give it a section anyway because it's a complex little beast. It's actually an enum that holds a bid vector and a maximum size denoting how many of those bids are actually "valid winners" vs just placeholders.

It's reversed, which is to say that the number one winner is always at the end of the vec. It's also always bigger generally than the number of winners so that if a bid is cancelled, we have some people who got bumped out of top spots that can be moved back into them without having to cancel and replace their bids. When a bid is placed, it is inserted in the proper position based on it's amount and then the lowest bidder is bumped off the 0th position of the vec if the vec is at max size, so the vec remains sorted at all times.

In the case of open edition, the max is always zero, ie there are never any winners, and we are just accepting bids and creating BidderMetadata tickets and BidderPots to accept payment for (probably) fixed price Participation NFTs.

We would prefer that OpenEdition enum have no bid vector and no max, but unfortunately borsh-js does not support enums with different internal data structures, so all data structures in an enum must be identical (even if unused.) Keep that in mind when designing your own end to end borsh implementations!

### BidderMetadata

This is created and/or updated during the `place_bid` and `cancel_bid` endpoints of the contract, and acts as proof to other contracts and this one that a bidder actually placed a bid, because there is no guarantee that this bidder will have an entry in the actual BidState as they could've gotten knocked off the array in high periods of bidder activity.

BidderMetadata always has a PDA of `['auction', auction_program_id, auction_id, bidder_key, 'metadata']` where `auction_program_id` is the program id of the auction contract, `auction_id` is the key of the auction, and `bidder_key` is the wallet making the bid.

### BidderPot

This ended up being a bit of a redundant struct, but this serves as a join table between the actual token account containing the funds collected by the auction for a given bidder, the bidder's sol wallet, and an auction. In the future we may merge this struct into BidderMetadata. There is also an `emptied` boolean on it to track whether or not the bidder pot has been claimed by the auctioneer for easy lookup.

BidderPot always has a PDA of `['auction', auction_program_id, auction_id, bidder_key]`where `auction_program_id` is the program id of the auction contract, `auction_id` is the key of the auction, and `bidder_key` is the wallet making the bid.

### AuctionDataExtended

If you've read this far, you now get to witness my personal shame. So as it turns out, if you build a complex enough program with enough structs flying around, there is some kind of weird interaction in the Metaplex contract that causes it to blow out with an access violation if you add more than a certain number of keys to one particular struct (AuctionData), and *only* during the redemption endpoint calls. We were unable to discern why this was across 3 days of debugging. We had a theory it was due to some issue with borsh but it is not 100% certain, as we're not experts with that library's internals.

Instead, our work-around was to introduce AuctionDataExtended to add new fields that we needed to AuctionData without breaking this hidden bug that seems to exist. What is odd about the whole thing is adding fields to *other* structs doesn't cause any issues. In the future I'd love to have someone who knows way more than me about these subjects weigh in and tell me what I did wrong here to resolve this split-brain problem! We also don't have reverse lookup capability (Resource key on AuctionData) because of this bug - adding it would cause the blow out I mentioned.

Another note here is `gap_tick_size_percentage` as of the time of this writing has not been implemented yet, it is just a dummy field.

AuctionDataExtended accounts always have PDA addresses of `['auction', auction_program_id, resource_id, 'extended']` where `resource_id` is the thing being auctioned off and `auction_program_id` is the id of the auction contract.

### Concepts

### Incompleteness

The contract currently has a deficiency in it's implementation where an auctioneer can claim the funds for a winning bid without the winner having signed off on having received some sort of prize for that bid - which is why we mention the "conjunction" above in the Overview. Metaplex guarantees through the interaction with the Metaplex contract that all users of Metaplex + Auction combination get a prize, but use of Auction by itself does not guarantee a winner gets a prize for a bid, because this functionality does not exist in this contract alone yet. A future version of this contract will require the winning bidders to create a PDA admitting they have received a prize before the auctioneer can withdraw funds, making this a complete primitive that can be used without any other contract making guarantees.

The way Metaplex makes such a guarantee is that it controls the Vault resource being bid on, and if you present the Metaplex contract with a BidderMetadata account from the Auction that represents a winning bid, it will disburse the proper NFT to you from the Vault. You can do the same with your own custom implementation.

### Cancelling before Placing a Bid

Currently you cannot change or place a new bid until you cancel the old one. Just keep that in mind - it makes for easier logic all around. This may change in the future as we add support for bidders not being able to cancel once a bid is placed, or not being able to bid less than they previously bid.

### Claiming bids

Pulling money out of the auction contract as an auctioneer can only be done after an auction has ended and must be done for each winning bid, one after the other. You provide a destination token account and drain each bidder pot to it via the `claim_bid` endpoint.

### Refunds

Refunds work by cancelling bids. Currently, any bidder can cancel any time during an auction, but only non-winners of the auction can cancel after it ends. When users cancel, they receive full refunds. The "refund bid" button on the front end just cancels the bid.

### Turning the Crank

The `place_bid` will turn the state of the auction to **Ended** if someone places a bid after the auction's `ended_at` date passes. It will then return `Ok(())` in a kind of silent pass without actually placing a bid. Once the auction is in the **Ended** state, bid funds can be claimed by the auctioneer. This is actually how an auction is really ended - it does not end on it's own accord, someone has to turn the crank! In theory, an auction will remain open for all eternity, past its own end date, if nobody touches it, but nobody can do any invalid things to it. It's kind of like Schrodinger's Cat. However, even if an auction is not officially in **Ended** state but it is past its `ended_at`, winners will not be allowed to cancel bids.

## Metaplex

### Overview

The Metaplex is the contract that knows how the others tie together and understands what an NFT truly is, how to auction it off and how to redeem it for others. It also understands the concept of royalties and how to pay them out. It's job is to act is the orchestrator between a Vault full of tokens, an Auction primitive, a bunch of winners, creators, and an auctioneer, and make sure everybody gets what is deserved, whether it be monies or tokens (though in the end they are all tokens).

It's state is reproduced here:

```rust
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug, Copy)]
pub enum Key {
    Uninitialized,
    OriginalAuthorityLookupV1,
    BidRedemptionTicketV1,
    StoreV1,
    WhitelistedCreatorV1,
    PayoutTicketV1,
    SafetyDepositValidationTicketV1,
    AuctionManagerV1,
		PrizeTrackingTicketV1,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct AuctionManager {
    pub key: Key,

    pub store: Pubkey,

    pub authority: Pubkey,

    pub auction: Pubkey,

    pub vault: Pubkey,

    pub accept_payment: Pubkey,

    pub state: AuctionManagerState,

    pub settings: AuctionManagerSettings,

		/// True if this is only winning configs of one item each, used for optimization in saving.
    pub straight_shot_optimization: bool,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct AuctionManagerState {
    pub status: AuctionManagerStatus,
    /// When all configs are validated the auction is started and auction manager moves to Running
    pub winning_config_items_validated: u8,

    pub winning_config_states: Vec<WinningConfigState>,

    pub participation_state: Option<ParticipationState>,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct AuctionManagerSettings {
    /// The safety deposit box index in the vault containing the winning items, in order of place
    /// The same index can appear multiple times if that index contains n tokens for n appearances (this will be checked)
    pub winning_configs: Vec<WinningConfig>,

    /// The participation config is separated because it is structurally a bit different,
    /// having different options and also because it has no real "winning place" in the array.
    pub participation_config: Option<ParticipationConfig>,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub struct ParticipationState {
    /// We have this variable below to keep track in the case of the participation NFTs, whose
    /// income will trickle in over time, how much the artists have in the escrow account and
    /// how much would/should be owed to them if they try to claim it relative to the winning bids.
    /// It's  abit tougher than a straightforward bid which has a price attached to it, because
    /// there are many bids of differing amounts (in the case of GivenForBidPrice) and they dont all
    /// come in at one time, so this little ledger here keeps track.
    pub collected_to_accept_payment: u64,

    /// Record of primary sale or not at time of auction creation, set during validation step
    pub primary_sale_happened: bool,

    pub validated: bool,

    /// An account for printing authorization tokens that are made with the one time use token
    /// after the auction ends. Provided during validation step.
    pub printing_authorization_token_account: Option<Pubkey>,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub struct ParticipationConfig {
    /// Setups:
    /// 1. Winners get participation + not charged extra
    /// 2. Winners dont get participation prize
    pub winner_constraint: WinningConstraint,

    /// Setups:
    /// 1. Non-winners get prize for free
    /// 2. Non-winners get prize but pay fixed price
    /// 3. Non-winners get prize but pay bid price
    pub non_winning_constraint: NonWinningConstraint,

    /// The safety deposit box index in the vault containing the template for the participation prize
    pub safety_deposit_box_index: u8,
    /// Setting this field disconnects the participation prizes price from the bid. Any bid you submit, regardless
    /// of amount, charges you the same fixed price.
    pub fixed_price: Option<u64>,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub enum WinningConstraint {
    NoParticipationPrize,
    ParticipationPrizeGiven,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, PartialEq, Debug)]
pub enum NonWinningConstraint {
    NoParticipationPrize,
    GivenForFixedPrice,
    GivenForBidPrice,
}

#[repr(C)]
#[derive(Clone, PartialEq, BorshSerialize, BorshDeserialize, Copy, Debug)]
pub enum WinningConfigType {
		/// You may be selling your one-of-a-kind NFT for the first time, but not it's accompanying Metadata,
    /// of which you would like to retain ownership. You get 100% of the payment the first sale, then
    /// royalties forever after.
    ///
    /// You may be re-selling something like a Limited/Open Edition print from another auction,
    /// a master edition record token by itself (Without accompanying metadata/printing ownership), etc.
    /// This means artists will get royalty fees according to the top level royalty % on the metadata
    /// split according to their percentages of contribution.
    ///
    /// No metadata ownership is transferred in this instruction, which means while you may be transferring
    /// the token for a limited/open edition away, you would still be (nominally) the owner of the limited edition
    /// metadata, though it confers no rights or privileges of any kind.
    TokenOnlyTransfer,
    /// Means you are auctioning off the master edition record and it's metadata ownership as well as the
    /// token itself. The other person will be able to mint authorization tokens and make changes to the
    /// artwork.
    FullRightsTransfer,
    /// Means you are using authorization tokens to print off editions during the auction using
    /// from a MasterEditionV1
    PrintingV1,
    /// Means you are using the MasterEditionV2 to print off editions
    PrintingV2,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct WinningConfig {
    // For now these are just array-of-array proxies but wanted to make them first class
    // structs in case we want to attach other top level metadata someday.
    pub items: Vec<WinningConfigItem>,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub struct WinningConfigState {
    pub items: Vec<WinningConfigStateItem>,
    /// Ticked to true when money is pushed to accept_payment account from auction bidding pot
    pub money_pushed_to_accept_payment: bool,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy, Debug)]
pub struct WinningConfigItem {
    pub safety_deposit_box_index: u8,
    pub amount: u8,
    pub winning_config_type: WinningConfigType,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy, Debug)]
pub struct WinningConfigStateItem {
    /// Record of primary sale or not at time of auction creation, set during validation step
    pub primary_sale_happened: bool,
    /// Ticked to true when a prize is claimed by person who won it
    pub claimed: bool,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, PartialEq)]
pub enum AuctionManagerStatus {
    Initialized,
    Validated,
    Running,
    Disbursing,
    Finished,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy)]
pub struct OriginalAuthorityLookup {
    pub key: Key,
    pub original_authority: Pubkey,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy)]
pub struct BidRedemptionTicket {
    pub key: Key,
    pub participation_redeemed: bool,
    pub items_redeemed: u8,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy)]
pub struct PayoutTicket {
    pub key: Key,
    pub recipient: Pubkey,
    pub amount_paid: u64,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy)]
pub struct Store {
    pub key: Key,
    pub public: bool,
    pub auction_program: Pubkey,
    pub token_vault_program: Pubkey,
    pub token_metadata_program: Pubkey,
    pub token_program: Pubkey,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy)]
pub struct WhitelistedCreator {
    pub key: Key,
    pub address: Pubkey,
    pub activated: bool,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy)]
pub struct SafetyDepositValidationTicket {
    pub key: Key,
    pub address: Pubkey,
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Copy, Debug)]
pub struct PrizeTrackingTicket {
    pub key: Key,
    pub metadata: Pubkey,
    pub supply_snapshot: u64,
    pub expected_redemptions: u64,
    pub redemptions: u64,
}
```

The instruction set for metaplex can be found here: [https://github.com/metaplex-foundation/metaplex/blob/master/rust/metaplex/program/src/instruction.rs](https://github.com/metaplex-foundation/metaplex/blob/master/rust/token-vault/program/src/instruction.rs)

### Types

### AuctionManager

This is the top level struct of the entire contract and serves as a container for "all the things." When you make auctions on Metaplex, you are actually really making these ultimately. An AuctionManager has a single authority (you, the auctioneer), a store, which is the storefront struct, an Auction from the auction contract, and a Vault from the vault contract. It also has a token account called `accept_payment` that serves as a central clearing escrow for all tokens that it will collect in the future from the winning bidders and all payments for fixed price participation nfts from all non-winners in the auction.

It contains embedded within it a separate `state` and `settings` struct. It is seeded with the `settings` on initialization by the caller, while the `state` is derived from `settings` on initialization. AuctionManager goes through several states:

**Initialized:** This is the state it begins in. You provide a **Created** auction and a **Combined** vault. You can't start the auction yet though because you need to prove to this AuctionManager that the configurations you provided in your settings match the tokens in the vault.

**Validated:** You have now proven that each winning configuration in your settings match the tokens in your vault, and you can start the auction via a proxy call.

**Running:** The underlying Auction is now running.

**Disbursing**: The underlying Auction is over and now the AuctionManager is in the business of disbursing royalties to the auctioneer and creators, prizes and participation NFTs to the winners, and possibly participation NFTs to the non-winners.

**Finished:** All funds and prizes disbursed.

This state is not currently in use as switching to it requires an iteration over prizes to review all items for claimed-ness and this costs CPU that is too precious during the redemption call OR adding new endpoint that is not guaranteed to be called. We will revisit it later to bring it back during a refactoring, for now it is considered a NOOP state.

AuctionManagers always have PDAs of seed `['metaplex', metaplex_program_id, auction_id]` where metaplex_program_id is the id of the Metaplex contract and `auction_id` is the address of the Auction being passed to the AuctionManager.

### AuctionManagerSettings

AuctionManagerSettings is an embedded struct inside AuctionManager but is deserving of it's own section. This struct is actually provided by the user in the `init_auction_manager` call to parameterize the AuctionManager with who is winning what and whether or not there is a participation NFT. It is fairly straightforward - for each entry in the WinningConfig vec, it stands for a given winning place in the Auction. The 0th entry is the WinningConfig for the 1st place winner. A WinningConfig has many WinningConfigItems. For each WinningConfigItem in the 0th WinningConfig, it is a mapping to a Vault SafetyDepositBox that the 1st place winner gets items from. You can therefore configure quite arbitrary Auctions this way.

This setup is actually quite redundant and will likely change in the future to a setup where a WinningConfigItem is the top level structure and it simply declares which winners will receive it, because if you wish for multiple winners to receive prints from the same Master Edition, the WinningConfigItem must right now be duplicated across each WinningConfig.

The Participation Config is optional, but has enums describing how it will behave for winners and for non-winners, whether or not it has a price associated with it, and what safety deposit box contains its printing tokens.

Notice that AuctionManagerSettings really doesn't contain settings about the auction. It really only breaks down how to divvy up the Vault. This is the separation of concerns in action - the Auction is parameterized with auction settings, while the AuctionManager understands how to divvy up rewards to winners and is parameterized that way. The Auction does not understand how to divvy up rewards, and the Metaplex contract does not understand how to do Auctions, only how to read winners off of it.

### AuctionManagerState

I consciously made the decision to keep AuctionManagerSettings identical to what you send up when you initialize AuctionManager. However, other things related to WinningConfigs, WinningConfigItems, etc change as the AuctionManager moves through its motions. These changes are recorded in AuctionManagerState, a kind of mirror object that is instantiated during the `init_auction_manager` action.

Specifically, for each WinningConfigItem, we need to record at the time of creation whether the primary sale had happened for later royalties measurement (because this could be changed during auction) and we need to record whether or not this particular WinningConfigItem has been claimed by the winner yet. We do similar things for Participation prize in it's own config.

### BidRedemptionTicket

This is created once per bid and keeps track of whether a given bidder has redeemed their main bid and their participation NFT. This is how the Metaplex contract guarantees a given bidder gets something in exchange for their BidderMetadata PDA in the Auction contract.

BidRedemptionTickets always have PDAs of `['metaplex', auction_id, bidder_metadata_key]` where the `auction_id` is the address of the Auction and the `bidder_metadata_key` is the address of the BidderMetadata PDA that the Auction contract produced.

### PayoutTicket

For each creator, for each metadata(WinningConfigItem), for each winning place(WinningConfig) in an Auction, a PayoutTicket is created to record the sliver of income generated for that creator. There is also one made for the Auctioneer for every such case. And yes, it really is that specific. This means that a given creator may have quite a few PayoutTickets for a single AuctionManager, but each one represents a slightly different royalty payout.

For instance, 1st place may have three items with 3 unique metadata won while 2nd place may have 4 metadata from 4 items, every item with a single unique creator. The split of funds in the 1st place is going to be 3 ways, while in 2nd place would be 4 ways. Even if 1st and 2nd place bids are the same, we want two records to reflect the royalties paid from 1st and 2nd place, because they would be different numbers in this case, and we want to preserve history.

PayoutTickets always have PDAs of `['metaplex', auction_manager_id, winning_config_index, winning_config_item_index, creator_index, safety_deposit_key, destination_owner]` where `auction_manager_id` is the address of the AuctionManager account, `winning_config_index` is the 0-based index of the WinningConfig in the AuctionManager settings you paid out in this ticket, `winning_config_item_index` is the 0-based index of the WinningConfigItem in that WinningConfig, `creator_index` is the 0-based creator index in that Metadata's creator array that you paid out for that WinningConfigItem (or 'auctioneer' if paying the auctioneer for this item), `safety_deposit_key` is the address to the safety deposit box for this item, and `destination_owner` is the owner of the destination account where the monies are being sent. Yeah, I know, painful.

### Store

Every person who forks the repository to make their own storefront should have a unique store struct that is seeded by their own administrative wallet. These are created and updated by the idempotent `set_store` endpoint. Each store can choose to use it's own token, token-metadata, token-vault and auction programs if it so chooses, though right now we've got a hard check that the token program is actually the global spl-token program. The store also can be either public or private, which determines whether or not AuctionManagers can sell items that have all non-whitelisted creators on them or not. We take a "bouncer-knows-your-friend-and-lets-you-in" approach to selling items in whitelist-only stores - if an item has at least one *verified* Whitelisted Creator, then it can be sold.

Store PDAs are always a PDA seed of `['metaplex', metaplex_program_id, admin_wallet]` where `metaplex_program_id` is the address of the Metaplex contract and `admin_wallet` is the wallet that is administering this store.

### WhitelistedCreator

A cousin of the simple Creator struct from the Metadata program, this is a foreign key connector between a creator address and a store. It denotes whether or not this creator is currently active in the store and if they are, allows items from them to be sold in it.

WhitelistedCreator PDAs are always a PDA seed of `['metaplex', metaplex_program_id, store_key, creator_key]` where `metaplex_program_id` is the address of the Metaplex contract, `store_key` is the address of the storefront, and `creator_key` is obviously the address of the creator's wallet you are whitelisting.

### SafetyDepositValidationTicket

This PDA solely exists to prevent validating a safety deposit box twice, which could present security vulnerabilities. It is created for each safety deposit box when it is presented for validation.

SafetyDepositValidationTickets are always PDAs with seed of `['metaplex', metaplex_program_id, auction_manager_id, safety_deposit_key]`where `metaplex_program_id` is the address of the Metaplex contract, `auction_manager_id` is the address of the AuctionManager, and `safety_deposit_key` is the address of the SafetyDepositBox being validated.

### OriginalAuthorityLookup

These are created during FullRightsTransfers. When a FullRightsTransfer is happening, the Metadata `updateAuthority` is shifted from the Auctioneer to the AuctionManager so that it can grant it in turn to the winner, and this record is created to keep track of who the original `updateAuthority` was to return it later if the item is not sold. That functionality (returns) is not implemented as of this writing but will be in the near future.

OriginalAuthorityLookups always have PDAs with seed of `['metaplex', auction_id, metadata_key]` where `auction_id` is the address of the Auction and `metadata_key` is the address of the actual Metadata struct.

### PrizeTrackingTicket

Created on a distinct WinningConfigItem basis (ie by WinningConfigType AND mint) across all WinningConfigs, one PrizeTrackingTicket is created to keep track of how many expected redemptions there will be across all winners for a given MasterEdition, and what the supply was when the first person hit redeem, to keep track of the relative edition offsets each person should get relative to winner #1, #2, etc. This is used for redeeming PrintingV2 bids, to ensure winner #1 gets edition #1, and so on.

### Concepts

### Types of Token Sales

There are five major types of token sales supported by the Metaplex protocol. Four are covered in the WinningConfigType enum, but this is a bit limiting as it is really only considering sales to *winners*, and leaves out the all-important Participation NFT which is a different kind of sale we will consider separately.

**TokenOnlyTransfer:** Probably the easiest to understand, this is a straight up spl_token_transfer command wrapped in a bunch of Metaplex magic. At the end of the day, the auctioneer still owns the Metadata struct and any other associated PDAs, but someone else now has the physical token in their wallets. These tokens will still show up and work just fine in Phantom and other supported wallet clients because those clients can still look up the Metadata. This is the difference between owning the Metadata and owning the token. For a token that is an Edition, the difference is nominal, as an Edition has zero printing rights and is immutable. However, for a token that is a MasterEdition, the difference is *substantial*, as the owner of the Metadata can rename it, change its symbol, it's URI, and creators array.

Note that owning the token itself is the *only* requirement for using the `update_primary_sale_happened_via_token` endpoint on the token metadata program *and* for using the `mint_new_edition_from_master_edition_via_token`.

**FullRightsTransfer:** This is a TokenOnlyTransfer, except in addition, the `updateAuthority` on the Metadata struct is set to the new owner as well, so they now have all the rights and privileges associated with the original owner, including the right to mint printing tokens. They can even change the name and URI of your token, so be careful!

**PrintingV1:** This token type represents a deprecated logic flow that will be removed in future editions and can only be accessed if using a MasterEditionV1 type of NFT. In this case, the safety deposit box in question does not contain the actual token, but a token from the token's Master Edition's `printing_mint`. This printing token gives the bearer the authorization to label any mint they have that has a supply of one and decimals zero as a child Edition of that Master Edition one time. This is how Metaplex used to do a Printing sale. It doesn't grant the winning bidder a Limited Edition NFT. It grants them a printing token, they make their own mint/token account combo, and take the printing token to the token metadata contract and label it themselves.

**PrintingV2:** The Auction holds the Master Edition in the safety deposit box and uses it via the special `mint_new_edition_from_master_edition_via_vault_proxy` call on Token Metadata to mint editions for auction winners. Once all bids have been redeemed, the auction releases the Master Edition from this escrow via the `withdraw_master_edition` call on Metaplex. This flow makes use of the PrizeTrackingTicket to keep track of the starting supply when the first redemption happens so that as each bidder comes in to redeem, everybody gets the correct offset for their edition relative to the #1 winner.

**Participation NFTs:** Treated just like a PrintingV2, except these are first-come-first-serve as far as edition-numbering goes. This endpoint will also collect payment if the participation config has a fixed price setting or is using the "use last bid" setting to charge the user based on their last bid. Note that charging users for participation NFTs only can happen if they lose. Since the user previously cancelled their bid if they lost, they will net no change or net the difference between their last bid and the fixed price.

### Royalties

Metadata come locked and stocked with arrays of creators, each with their own `share` and all guaranteed to sum to 100. The Metadata itself has a `seller_fee_basis_points` field that represents the share creators get out of the proceeds in any secondary sale and a `primary_sale_happened` boolean that distinguishes to the world whether or not this particular Metadata has experienced it's first sale or not. With all of this, Metaplex is able to do complete Royalty calculations after an Auction is over. It was mentioned above that on initialization, the Metaplex contract snapshots for each Metadata being sold the `primary_sale_happened` just in case the boolean is flipped during the auction so that royalties are calculated as-of initiation - this is important to note.

At the end of the auction, anybody (permissionless) can cycle through each winning bid in the contract and ask the Metaplex contract to use its authority to call the Auction contract and pump the winning bid monies into the `accept_payment` escrow account via `claim_bid`. Once all winning bids have been settled into here, royalties are eligible to be paid out. We'll cover payouts of fixed price Participation NFTs separately.

Now, anybody (permissionless) can cycle through each creator PLUS the auctioneer on each item in each winning bid and call `empty_payment_account` with an Associated Token Account that is owned by that creator or auctioneer and that action will calculate, using the creator's share or auctioneer's share of that item's metadata, and the fractional percentage of that item of the overall winning basket, to payout the creator or auctioneer from the escrow.

Our front end implementation immediately calls the `update_primary_sale_happened` endpoint on token metadata for any token once redeemed for users so that if they re-sell, the `primary_sale_happened` boolean is taken into account in the `empty_payment_account` logic and only the basis points given in `seller_fee_basis_points` goes to the creators instead of the whole pie. The remaining part of the pie goes to the auctioneer doing the reselling.

We don't do weighted items in winning baskets right now - if a winning basket has 3 unique metadata in it right now, it is split three ways, even if one of the metadata is disbursing 3 tokens while the other is disbursing 2. This may come in a future version. Once this cycle is complete, the escrow account is usually empty.

Things get a little complex when participation NFTs come into play. When a participation NFT has a fixed price, it is only paid in the case of non-winners. What they first do is cancel their bid, getting a refund, and then they redeem their participation bid with the `redeem_participation_bid` endpoint. This charges them the fixed price and dumps those funds into the `accept_payment` account. At intervals, someone must come and turn the crank to dump the proceeds to the creators of the Participation NFT from the latest redeemers of that NFT because they will only receive proceeds as people come and redeem and pay for them.

Note because our front end implementation chooses to use SOL instead of a generic SPL token, we use a Wrapped SOL ATA account for creators. They are then forced to use a drop down menu to liquidate and close the Wrapped SOL ATA account when they next login, absorbing the Wrapped SOL back into their normal SOL wallets. If you choose not to use SOL in your implementation, you will not have this difficulty.

### Validation

Just because you provide a vault to an AuctionManager and an AuctionManagerSettings declaring this vault is filled with wonderful prizes *does not* believe that Metaplex will believe you. For every safety deposit box indexed in a WinningConfigItem, there must be a call to `validate_safety_deposit_box` after initiation where the safety deposit box is provided for inspection to the Metaplex contract so that it can verify that there are enough tokens, and of the right type, to pay off all winners in the auction.

Given how irritating this process is, we may in the future merge token-vault with metaplex, or simply copy over the parts of it that are relevant, leaving token-vault out for those interested in experimenting with fractionalization.

### Unwon Items

Any Token Only Transfer item, or MasterEditionV1/MasterEditionV2 stored for a Full Rights Transfer unwon in an Auction can be returned to the Auction Manager by calling the  `redeem_unused_winning_config_items_as_auctioneer` end point. It acts as a proxy, calling the `redeem_bid` or `redeem_full_rights_transfer_bid` depending on how it is parameterized, and passing in a winning_index that overrides the actual winning_index that would be detected for the bidder_info key being passed in (which is the auctioneer's in this case.) In this way the auctioneer acts not as a winning bidder but as a generic "non-bidder" who empties each prize that has no bidder using the same redemption flow. For MasterEditionV2s stored for PrintingV2 or Participation prizes, these can be withdrawn using `withdraw_edition`.
