Airdrop creator:
- Supplies a list of phone numbers (twitter, discord, etc) to an off-chain
  website
- The website
    - Creates a PDA for each recipient with [handle, pin] as seeds (0 SOL)
    - Builds a merkle tree given the PDAs (off-chain)
    - Creates a transaction to initialize merkle-distributor state for this new
      tree (transaction fee + rent for the state)
    - Sends an encrypted message to each user with a uri that has the pin plus
      the merkle proof that the address exists in the merkle tree.

link = `https://{website}/?handle={phone-number}&pin={pin}&proof={proof}`

Airdrop recipient:
- Clicks the link to claim the airdrop
- Signs the transaction with their phantom wallet for fees
    - Optionally changes the token address to receive the airdrop
- merkle-distributor sends the token to the TA

In case the user doesn't have a phantom wallet, we would also need some
integration with an easy way to purchase SOL with USD.
