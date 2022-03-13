import { StringPublicKey } from '@oyster/common';

import { SafetyDepositDraft } from '../../../../actions/createAuctionManager';

export const isSelected = ({
  selectedItems,
  pubkey,
}: {
  selectedItems: Record<string, SafetyDepositDraft>;
  pubkey?: StringPublicKey;
}): boolean => !!(pubkey && selectedItems[pubkey]);
