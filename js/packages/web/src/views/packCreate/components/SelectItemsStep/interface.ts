import { SafetyDepositDraft } from '../../../../actions/createAuctionManager';

export interface SelectItemsStepProps {
  handleSelectItem: (item: SafetyDepositDraft) => void;
  items: SafetyDepositDraft[];
  selectedItems: Record<string, SafetyDepositDraft>;
  showSupply?: boolean;
  emptyMessage?: string;
}
