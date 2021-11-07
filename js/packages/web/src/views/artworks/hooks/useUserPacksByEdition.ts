import { useMemo } from 'react';
import { useMeta } from '@oyster/common';

import { useUserVouchersByEdition } from './useUserVouchersByEdition';
import {
  ExtendedPackByKey,
  PackByKey,
  ProvingProcessByKey,
  ExtendedVoucherByKey,
} from '../types';

export const useUserPacksByEdition = (): ExtendedPackByKey => {
  const { packs, provingProcesses } = useMeta();
  const userVouchersByEdition = useUserVouchersByEdition();
  const userPacks = useMemo(
    () =>
      getPacksByEditions({ userVouchersByEdition, packs, provingProcesses }),
    [userVouchersByEdition, packs, provingProcesses],
  );

  return userPacks;
};

const getPacksByEditions = ({
  userVouchersByEdition,
  packs,
  provingProcesses,
}: {
  userVouchersByEdition: ExtendedVoucherByKey;
  packs: PackByKey;
  provingProcesses: ProvingProcessByKey;
}): ExtendedPackByKey =>
  // Use edition as key
  Object.entries(userVouchersByEdition).reduce<ExtendedPackByKey>(
    (acc, [editionKey, voucher]) => {
      if (packs[voucher.info.packSet]) {
        const provingProcess = Object.values(provingProcesses).find(
          process => process.info.voucherMint === voucher.mint,
        );
        acc[editionKey] = {
          ...packs[voucher.info.packSet],
          voucher: voucher.pubkey,
          edition: editionKey,
          cardsRedeemed: provingProcess?.info.cardsRedeemed,
        };
      }
      return acc;
    },
    {},
  );
