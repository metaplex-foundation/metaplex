# Allow List Program

## The Why

It’s become a very common and powerful marketing tool to provide early members of NFT projects/communities with a special role that provides them with a guaranteed spot to mint at least 1 NFT early. It’s extremely popular on ETH and other blockchains, but on SOL if you use Candy Machine, there’s no good way to do it on chain currently.

A few approaches that I’ve seen are:

1. Using Fair Launch Protocol. While a good approach for some, it’s not a good fit for all projects
2. Using a custom SPL Token for a separate candy machine instead of $SOL for allow listed users
3. Collect wallet addresses and use an off-chain database to allow users to mint on your website only if they’re in the database.

The first two approaches are decent solutions and the third approach basically does nothing to stop bots from minting early during the allow list period. I believe there’s room for improvement with adding a native allow list program to the Metaplex Candy Machine Program.

## The Approach

- It would bet structured similarly to how the “token metadata” program functions, where it’s a separate program that candy machine communicates with during mint
- A command like `metaplex create_allow_list --allow-list ./allow-list-file.csv` would be used to create the allow list PDA and store the data on chain
- Allow list would need to have a start and end date to signify when the allow list validation would happen and when the “public mint” would be triggered
  - End date could probably just be the normal candy machine start date?
  - During the allow list period, only wallet addresses that are in the allow list PDA can successfully mint
  - If a wallet isn’t in the allow list and attempts to mint, a specific error would need to be returned so frontends can notify users of this
- Allow list would need to be optional to retain backwards compatibility with current candy machine configurations.
  - If a allow list isn’t defined during creation, we assume it just doesn’t exist and move on like normal
- Allow list would be a simple, comma-separated list of wallet addresses. This list would be just a local file with a specific format that is uploaded from the CLI.
- The allow list will be created during the candy machine creation. For now, it's not mutable. This may change after this initial implementation is proven to be a viable option. This is just to keep things simple.
- The allow list CSV file will be sorted before being uploaded so we can use binary search to keep matching computationally cheap on chain
