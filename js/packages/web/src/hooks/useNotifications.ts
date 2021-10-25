import {
  AuctionState,
  VaultState,
  AuctionManagerStatus,
  useConnection,
  StringPublicKey,
  WalletSigner,
} from '@oyster/common';
import { 
  startAuctionManually,
  decommAuctionManagerAndReturnPrizes,
  unwindVault
} from '../actions';
import { useCompactAuctions } from './useAuctions';

export enum StorefrontNotificationType {
  Upcoming,
  Broken,
  Unwind,
}

interface StorefrontNotification {
  auctionManagerPubkey: StringPublicKey;
  type: StorefrontNotificationType;
  description: string;
  callToAction: string;
  action:() => Promise<void>;
}

export const useNotifications = (
  wallet: WalletSigner,
): StorefrontNotification[] => {
  const auctions = useCompactAuctions();
  const connection = useConnection();
  const walletPubkey = wallet.publicKey?.toBase58();

  const notifications =
    auctions.reduce((memo, auctionView) => {
        let next = [...memo];
        if (
          auctionView.auction.info.state === AuctionState.Created &&
          auctionView.auctionManager.info.state.status === AuctionManagerStatus.Validated &&
          auctionView.auctionManager.info.authority === walletPubkey
        ) {
          const upcoming = {
            auctionManagerPubkey: auctionView.auctionManager.pubkey,
            type: StorefrontNotificationType.Upcoming,
            description: 'You have an auction that has not started yet. If you want start the auction now.',
            callToAction: 'Start Auction',
            action: async () => startAuctionManually(
              connection,
              wallet,
              auctionView.auctionManager,
            )
          };

          next = [...next, upcoming];
        }

        if (
          auctionView.auctionManager.info.state.status ===
            AuctionManagerStatus.Initialized &&
          auctionView.auctionManager.info.authority === walletPubkey
        ) {
          const possiblyBroken = {
            auctionManagerPubkey: auctionView.auctionManager.pubkey,
            type: StorefrontNotificationType.Broken,
            description: 'You have an NFT locked in a defective listing. Decommission it now to re-claim the NFT.',
            callToAction: 'Decommission Listing',
            action: async () =>  decommAuctionManagerAndReturnPrizes(
              connection,
              wallet,
              auctionView,
            ),
          };

          next = [...next, possiblyBroken]
        }
        
        if (
          auctionView.vault.info.authority === walletPubkey &&
          auctionView.vault.info.state != VaultState.Deactivated &&
          auctionView.vault.info.tokenTypeCount > 0
        ) {
          const unwind = {
            auctionManagerPubkey: auctionView.auctionManager.pubkey,
            type: StorefrontNotificationType.Unwind,
            description: 'You have an NFT locked in a defective vault. Unwind it now to re-claim the NFT.',
            callToAction: 'Unwind Vault',
            action: async () => unwindVault(
              connection,
              wallet,
              auctionView.vault,
            ),
          };

          next = [...next, unwind]
        }

        return next;
      },
      [] as StorefrontNotification[],
    );

  return notifications;
};
