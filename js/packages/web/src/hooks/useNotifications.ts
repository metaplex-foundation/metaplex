import {
  AuctionState,
  StringPublicKey,
  VaultState,
  AuctionManagerStatus,
} from '@oyster/common';
import { AuctionViewCompact, useCompactAuctions } from '.';

interface StorefrontNotifications {
  upcomingAuctions: AuctionViewCompact[];
  vaultsNeedUnwinding: AuctionViewCompact[];
  possiblyBrokenAuctions: AuctionViewCompact[];
}

export const useNotifications = (
  walletPubkey: StringPublicKey,
): StorefrontNotifications => {
  const auctions = useCompactAuctions();

  const [upcomingAuctions, possiblyBrokenAuctions, vaultsNeedUnwinding] =
    auctions.reduce(
      (memo: AuctionViewCompact[][], av) => {
        let [upcoming, possiblyBroken, needUnwinding] = memo;

        if (
          av.auction.info.state === AuctionState.Created &&
          av.auctionManager.info.authority === walletPubkey
        ) {
          upcoming = [...upcoming, av];
        }

        if (
          av.auctionManager.info.state.status ===
            AuctionManagerStatus.Initialized &&
          av.auctionManager.info.authority === walletPubkey
        ) {
          possiblyBroken = [...possiblyBroken, av];
        }

        if (
          av.vault.info.authority === walletPubkey &&
          av.vault.info.state != VaultState.Deactivated &&
          av.vault.info.tokenTypeCount > 0
        ) {
          needUnwinding = [...needUnwinding, av];
        }

        return [upcoming, possiblyBroken, needUnwinding];
      },
      [[], [], []],
    );

  return {
    upcomingAuctions,
    vaultsNeedUnwinding,
    possiblyBrokenAuctions,
  };
};
