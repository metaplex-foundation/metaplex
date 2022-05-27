import React from 'react';
import { ArtCard } from '../../components/ArtCard';
import PackCard from '../../components/PackCard';
import { useMeta } from '../../contexts';
import { SafetyDepositDraft } from '../../actions/createAuctionManager';

interface IAuctionItemCard {
  current: SafetyDepositDraft;
  isSelected?: boolean;
  onSelect: () => void;
  onClose?: () => void;
}

const AuctionItemCard = ({
  current,
  isSelected,
  onSelect,
  onClose,
}: IAuctionItemCard) => {
  const { packs, vouchers } = useMeta();
  const shouldShowPacks = process.env.NEXT_ENABLE_NFT_PACKS === 'true';

  if (shouldShowPacks) {
    const parent = current.edition?.info?.parent;
    const voucher = Object.values(vouchers).find(
      v => v?.info?.master === parent,
    );

    if (voucher) {
      const {
        info: { authority, allowedAmountToRedeem, name, uri },
      } = packs[voucher.info.packSet];

      return (
        // use <div> for correct grid rendering
        <div onClick={onSelect}>
          <PackCard
            name={name}
            voucherMetadata={current.metadata.pubkey}
            uri={uri}
            authority={authority}
            allowedAmountToRedeem={allowedAmountToRedeem}
            onClose={onClose}
            artView
          />
        </div>
      );
    }
  }

  return (
    <ArtCard
      pubkey={current.metadata.pubkey}
      preview={false}
      onClick={onSelect}
      className={isSelected ? 'selected-card' : 'not-selected-card'}
      onClose={onClose}
    />
  );
};

export default AuctionItemCard;
