# Metatlex NFT packs Solana program

## NFT packs actions

- Admin init a pack
    - pack account is PDA with seeds [“nft-pack”, nft_pack_program_id, store, pack_admin_key, pack_name]
    - store address sawing to pack
    - set distribution type(max_supply, fixed, unlimited)
    - set allowed amount to redeem
    - set if it’s mutable
    - set dates(redeem start and end)
- Add cards
    - adding a card means we transfer MasterEdition to program account so we are able to mint Edition once user open a pack
    - every card account is PDA with seeds [pack_key, "card", index]
- Add voucher
    - save MasterEdition data(keys) so we can match Editions with this Master when users will open a pack
    - pack can have multiple different vouchers and every voucher has the same value and gives users the same amounts of attempts to redeem cards
    - voucher it's Edition means token in terms of Metaplex but in terms of nft-packs program it's PDA account with seeds [pack_key, "voucher"] which stores some data
    - we can add only voucher which we are own
- Activate
    - in activated state admin can't change any pack data
    - users can start to open a pack, means call RequestCardForRedeem and ClaimPack
- Deactivate
    - when pack is deactivated users can't interact with it and admin can change data
- Request card for redeem
    - user calls this instruction to receive index of card which he can try to redeem next(1 of n)
    - index of next card to redeem is writing to ProvingProcess(maybe will change this name) account
    - ProvingProcess it's PDA account with seeds [pack, "proving", voucher_mint_key]
- Claim
    - user call this instruction after he has card index in ProvingProcess account
    - program is using RandomOracle program to count probability to decide will user receive Edition from this card or not
    - after this operation program saves info that some specific voucher was used to claim card, just by incrementing some variable
- Edit pack
    - can be called only if pack is in deactivated state
    - can be changed pack name, description, URI(pack wallpaper) and mutable field
- Close pack
    - can be called only if pack doesn't have redeem end date
    - irreversible pack state changing
- Delete card
    - cards can be deleted only if pack is in closed state
    - deleting cards means transferring MasterEdition back to the admin and zeroing PackCard account, so we just empty the balance
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
|distribution_type|	enum|	[max_supply, fixed, unlimited]|
|allowed_amount_to_redeem|u32|	Count of cards user can try to redeem|
|redeem_start_date|	u64|	Date when users can start to redeem cards|
|redeem_end_date|	Option(u64)|	Date when pack set becomes inactive|
    
**PackCard**

PDA with seeds [pack_key, 'card', index]

|Parameter|Type|Description|
|--------|----------|--------------|
|pack_set|	Pubkey|Pack key	|
|master|	Pubkey|	MasterEdition account|
|metadata|	Pubkey|	Metadata account|
|token_account|	Pubkey|	Program token account which holds MasterEdition token|
|max_supply|	u32|	How many editions this card can mint|
|weight|	u32|	Card weight. Uses in probability calculation for fixed and unlimited distribution types|
    
**PackVoucher**

PDA with seeds [pack_key, 'voucher', index]

|Parameter|Type|Description|
|--------|----------|--------------|
|pack_set|	Pubkey| Pack set key	|
|master|	Pubkey|	MasterEdition account|
|metadata|	Pubkey|	Metadata account|
    
**ProvingProcess**

PDA with seeds [pack_key, 'proving', voucher_edition_mint]

|Parameter|Type|Description|
|--------|----------|--------------|
|pack_set|	Pubkey| Pack set key	|
|voucher_mint|	Pubkey| Voucher mint	|
|next_card_to_redeem|	u32|	Index of next card to redeem|
|cards_redeemed|	u32|	How many cards user already redeemed|
    

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