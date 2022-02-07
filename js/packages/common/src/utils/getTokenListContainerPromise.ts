import {
  TokenListContainer,
  TokenListProvider,
} from '@solana/spl-token-registry';

let _cachedTokenListContainerPromise: Promise<TokenListContainer> | null;

export function getTokenListContainerPromise() {
  if (_cachedTokenListContainerPromise == null) {
    _cachedTokenListContainerPromise = new TokenListProvider().resolve();
  }
  return _cachedTokenListContainerPromise;
}
