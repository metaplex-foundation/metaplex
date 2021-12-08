import React from "react";
import { ArtCard } from '../../components/ArtCard';
import PackCard from "../../components/PackCard";
import { useMeta } from '../../contexts';
import { SafetyDepositDraft } from '../../actions/createAuctionManager';

interface IAuctionItemCard {
  current: SafetyDepositDraft;
  isSelected?: boolean;
  onSelect: () => void;
  onClose?: () => void;
}

const AuctionItemCard = ({ current, isSelected, onSelect, onClose }: IAuctionItemCard) => {
  const {packs, vouchers} = useMeta();
  const masterEdition = current.masterEdition?.pubkey;
  const voucher = Object.values(vouchers).find(v => v?.info?.master === masterEdition);
  if (voucher) {
    const pack = packs[voucher.info.packSet];
    const {
      info: {authority, allowedAmountToRedeem, name},
    } = pack;
    return (
      // use <div> for correct grid rendering
      <div onClick={onSelect}>
        <PackCard
          name={name}
          voucherMetadata={voucher.info.metadata}
          authority={authority}
          allowedAmountToRedeem={allowedAmountToRedeem}
          close={onClose}
          artView
        />
      </div>
    )
  }
  return (
    <ArtCard
      pubkey={current.metadata.pubkey}
      preview={false}
      onClick={onSelect}
      className={isSelected ? 'selected-card art-card-for-selector' : 'not-selected-card art-card-for-selector'}
      close={onClose}
    />
  );
};

export default AuctionItemCard;
