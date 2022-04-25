# Metaplex NFT packs Solana program

Supports creation of "mystery" packages of NFTs that are not revealed until after "opening", similar to the experience you have when purchasing a pack of baseball cards at the store.

## NFT packs actions

- Admin init a pack
    - pack account is PDA with seeds [“nft-pack”, nft_pack_program_id, store, pack_admin_key, pack_name]
    - store address is saved in pack
    - set distribution type(max_supply, weighted, unlimited)
    - set allowed amount to redeem
    - set if it’s mutable
    - set dates(redeem start and end)
- Add cards
    - adding a card means we transfer MasterEdition to program account so we are able to mint Edition once user open a pack
    - every card account is PDA with seeds [pack_key, "card", index]
- Add voucher
    - save MasterEdition data(keys) so we can match Editions with this Master when users will open a pack
    - pack can have multiple different vouchers and every voucher has the same value and gives users the same amounts of cards from the pack
    - voucher is Edition in terms of Metaplex but in terms of nft-packs program it's PDA account with seeds [pack_key, "voucher", index] which stores some data
    - we can add only voucher which we are own
    - to sum up, when we add voucher to the pack we save MasterEdition key to the pack and every user who has Edition from that MasterEdition owns a voucher for created pack and can open it
- Activate
    - in activated state admin can't change any pack data
    - users can start to open a pack (using `RequestCardForRedeem` and `ClaimPack` methods)
- Deactivate
    - when pack is deactivated users can't interact with it and admin can change data
- CleanUp
    - sort weights Vec which is stored in PackConfig account
- Request card for redeem
    - user calls this instruction to receive index of card which he can redeem
    - program burns user's voucher token account
    - program is using hash of slot, timestamp and recent slothash to count probability to decide which card user will receive
    - probability is calculating using weighted list from PackConfig account
    - index of next card to redeem is written to ProvingProcess account
    - ProvingProcess is a PDA account with seeds [pack, "proving", voucher_mint_key]
    - once user call this instruction weights Vec should be sorted with `CleanUp` instruction
- Claim
    - user call this instruction after they receive a card index from `Request card for redeem`
    - program mints new Edition to user wallet
- Edit pack
    - can be called only if pack is in deactivated state
    - allows changing pack `name`, `description`, `URI`(pack wallpaper) and `mutable` fields
- Close pack
    - can be called at any time if pack doesn't have redeem end date and if it has only after redeem end date
    - if admin tries to call this instruction before redeem end date program will return `EndDateNotArrived` error
    - irreversible pack state changing
- Delete card
    - cards can be deleted only if pack is in closed state
    - deleting cards means transferring MasterEdition back to the admin, zeroing PackCard account and emptying the card balance
- Delete voucher
    - vouchers can be deleted only if pack is in closed state
    - empty the balance
- Delete pack
    - pack can be deleted only when all the cards and vouchers were deleted
    - empty the balance

## Accounts

**PackSet**

|Parameter|Type|Description|
|--------|----------|--------------|
|store|Pubkey|Store
|name	|   [u8; 32]|	Pack's name|
|description|String|Pack description|
|img_link|	String(limited to 200)|	Link to Arweave cover image|
|authority|	Pubkey|	Pack authority|
|pack_cards|u32|	Card masters counter|
|pack_vouchers|u32|	Pack voucher counter|
|total_weight|u64|Total weight
|total_editions|u64|Total amount of editions pack can mint|
|mutable|	bool|	If true authority can make changes at deactivated phase|
|pack_state|	enum|	[not activated, activated, deactivated, ended]|
|distribution_type|	enum|	[max_supply, weighted, unlimited]|
|allowed_amount_to_redeem|u32|	Count of cards user can try to redeem|
|redeem_start_date|	u64|	Date when users can start to redeem cards|
|redeem_end_date|	Option(u64)|	Date when pack set becomes inactive|
    
**PackCard**

PDA with seeds ['card', pack_key, index]

|Parameter|Type|Description|
|--------|----------|--------------|
|pack_set|	Pubkey|Pack key	|
|master|	Pubkey|	MasterEdition account|
|metadata|	Pubkey|	Metadata account|
|token_account|	Pubkey|	Program token account which holds MasterEdition token|
|max_supply|	u32|	How many editions this card can mint|
|weight|	u16|	Card weight. Uses in probability calculation for fixed and unlimited distribution types|
    
**PackVoucher**

PDA with seeds ['voucher', pack_key, index]

|Parameter|Type|Description|
|--------|----------|--------------|
|pack_set|	Pubkey| Pack set key	|
|master|	Pubkey|	MasterEdition account|
|metadata|	Pubkey|	Metadata account|
    
**ProvingProcess**

PDA with seeds ['proving', pack_key, voucher_edition_mint]

|Parameter|Type|Description|
|--------|----------|--------------|
|wallet_key|	Pubkey| User wallet key	|
|is_exhausted|	bool| Is there left any card in voucher	|
|pack_set|	Pubkey| Pack set key	|
|voucher_mint|	Pubkey| Voucher mint	|
|cards_redeemed|	u32|	How many cards user already redeemed|
|cards_to_redeem|	BTreeMap(u32, u32)|	BTreeMap with cards to redeem and statuses if it's already redeemed|

**PackConfig**

PDA with seeds ['config', pack_key]

|Parameter|Type|Description|
|--------|----------|--------------|
|weights|	Vec<(u32, u32, u32)>| Weights Vec(u32 card_index, u32 either max_supply or weight, u32 max_supply for weighted cards)	|
|action_to_do| enum[change, sort, none] | Action `CleanUp` instruction has to do |
    

## Distribution types

- Unlimited
    
    Probability is set by user, putting weight (chance of revealing) for each card.
    
    Supply — unlimited (cards never run out), user can't choose amount of each cards for the pack.
    
    Cards with unlimited edition could be used inside the pack.
    
- Weighted
    
    Probability is set by user, putting weight (chance of revealing) for each card.
    
    Supply — limited, user chooses amount of each cards for the pack.
    
    Cards with limited and unlimited (user needs to set max supply for unlimited ones) edition could be used inside the pack.
    
- Supply
    
    Probability is set automatically depending on supply of each card.
    
    Supply — limited, user chooses amount of each cards for the pack.
    
    Cards with limited and unlimited (user needs to set max supply for unlimited ones) edition could be used inside the pack.