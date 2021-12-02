import { ParsedAccount, StringPublicKey } from '@oyster/common';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';
import { PackVoucher } from '@oyster/common/dist/lib/models/packs/accounts/PackVoucher';
import { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';

export type ExtendedVoucher = ParsedAccount<PackVoucher> & {
  mint: StringPublicKey;
  edition: StringPublicKey;
};

export type VoucherByKey = Record<string, ParsedAccount<PackVoucher>>;
export type ExtendedVoucherByKey = Record<string, ExtendedVoucher>;
export type PackByKey = Record<string, ParsedAccount<PackSet>>;
export type ExtendedPack = ParsedAccount<PackSet> & {
  voucher: StringPublicKey;
  edition: StringPublicKey;
  cardsRedeemed?: number;
  voucherMetadataKey?: StringPublicKey;
  provingProcessKey?: StringPublicKey;
};
export type ExtendedPackByKey = Record<string, ExtendedPack>;
export type ProvingProcessByKey = Record<string, ParsedAccount<ProvingProcess>>;

export type Item = ExtendedPack | ParsedAccount<PackSet>;

export enum ArtworkViewState {
  Metaplex = '0',
  Owned = '1',
  Created = '2',
}
