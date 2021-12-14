import { PackVoucher } from '@oyster/common/dist/lib/models/packs/accounts/PackVoucher';
import { ParsedAccount, StringPublicKey } from '@oyster/common';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';
import { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';

export type VoucherByKey = Record<string, ParsedAccount<PackVoucher>>;
export type ExtendedVoucher = ParsedAccount<PackVoucher> & {
  mint: StringPublicKey;
  edition: StringPublicKey;
};

export type ExtendedVoucherByKey = Record<string, ExtendedVoucher>;
export type PackByKey = Record<string, ParsedAccount<PackSet>>;
export type ExtendedPack = ParsedAccount<PackSet> & {
  voucher: StringPublicKey;
  voucherMetadataKey: StringPublicKey;
  cardsRedeemed?: number;
  mint?: StringPublicKey;
  provingProcessKey?: StringPublicKey;
};
export type ProvingProcessByKey = Record<string, ParsedAccount<ProvingProcess>>;
