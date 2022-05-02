import { Metadata, ParsedAccount, StringPublicKey } from '@oyster/common';
import { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';

interface GetInitialProvingProcessParams {
  provingProcesses: Record<string, ParsedAccount<ProvingProcess>>;
  provingProcessKey?: StringPublicKey;
  voucherMetadata?: ParsedAccount<Metadata>;
}

// Returns proving process depending on which parameter from URL to use: provingProcessKey or voucherMetadataKey
export const getInitialProvingProcess = ({
  provingProcesses,
  provingProcessKey,
  voucherMetadata,
}: GetInitialProvingProcessParams): ParsedAccount<ProvingProcess> | null => {
  if (provingProcessKey) {
    return provingProcesses[provingProcessKey];
  }

  const provingProcessByVoucher = Object.values(provingProcesses).find(
    ({ info }) => info.voucherMint === voucherMetadata?.info.mint,
  );
  if (provingProcessByVoucher) {
    return provingProcessByVoucher;
  }

  return null;
};
