import {
  AuctionState,
  VaultState,
  AuctionManagerStatus,
  useConnection,
  StringPublicKey,
  WalletSigner,
  useMeta,
} from '@oyster/common';
import {
  startAuctionManually,
  decommAuctionManagerAndReturnPrizes,
  unwindVault,
} from '../actions';
import { useCompactAuctions } from './useAuctions';

export enum StorefrontNotificationType {
  Upcoming,
  Broken,
  Unwind,
}

interface StorefrontNotification {
  accountPubkey: StringPublicKey;
  type: StorefrontNotificationType;
  description: string;
  callToAction: string;
  action: () => Promise<void>;
}

export const useNotifications = (
  wallet: WalletSigner,
): StorefrontNotification[] => {
  const auctions = useCompactAuctions();
  const connection = useConnection();
  const { vaults } = useMeta();
  const walletPubkey = wallet.publicKey?.toBase58();

  let notifications = [] as StorefrontNotification[];

  auctions.forEach(auctionView => {
    if (
      auctionView.auction.info.state === AuctionState.Created &&
      auctionView.auctionManager.info.state.status ===
        AuctionManagerStatus.Validated &&
      auctionView.auctionManager.info.authority === walletPubkey
    ) {
      const upcoming = {
        accountPubkey: auctionView.auctionManager.pubkey,
        type: StorefrontNotificationType.Upcoming,
        description:
          'You have an auction that has not started yet. If you want start the auction now.',
        callToAction: 'Start Auction',
        action: async () =>
          startAuctionManually(connection, wallet, auctionView.auctionManager),
      };

      notifications = [...notifications, upcoming];
    }

    if (
      auctionView.auctionManager.info.state.status ===
        AuctionManagerStatus.Initialized &&
      auctionView.auctionManager.info.authority === walletPubkey
    ) {
      const possiblyBroken = {
        accountPubkey: auctionView.auctionManager.pubkey,
        type: StorefrontNotificationType.Broken,
        description:
          'You have an NFT locked in a defective listing. Decommission it now to re-claim the NFT.',
        callToAction: 'Decommission Listing',
        action: async () =>
          decommAuctionManagerAndReturnPrizes(connection, wallet, auctionView),
      };

      notifications = [...notifications, possiblyBroken];
    }
  });

  Object.values(vaults).forEach(vault => {
    if (
      vault.info.state != VaultState.Deactivated &&
      vault.info.authority === walletPubkey &&
      vault.info.tokenTypeCount > 0
    ) {
      notifications.push({
        accountPubkey: vault.pubkey,
        type: StorefrontNotificationType.Unwind,
        description:
          'You have an NFT locked in a defective vault. Unwind it now to re-claim the NFT.',
        callToAction: 'Unwind Vault',
        action: async () => unwindVault(connection, wallet, vault),
      });
    }
  });

  return notifications;
};
