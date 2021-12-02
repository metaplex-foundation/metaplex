## NOTE
Its much easier for us to read and review a PR that is small, linted, and contains only one material enhancement. If your PR is very large and encompasing many features consider breaking it up in to a few PRs so we can digest the information in each pr with more accuracy.

## Description

This pull request improves several aspects of the verify process. 
- Retries any (known) network related issues during the fetches.
- Outputs cleaned log values without nulls.
- Presents all of the issues at the end, with some recommendations.
- Does not replace links with null, and better handles on-chain true/false state.
- Stores a hash of the link when checked out. Will not re-check on future runs if the link doesn't change.

## References

https://github.com/metaplex-foundation/metaplex/issues/1030

## Testing

Testing involves just running verify. If working with a large set of assets, the network issues seem frequent.  If not, changing the link uri in the cache to invalid uris will test some of the situations this handles.

