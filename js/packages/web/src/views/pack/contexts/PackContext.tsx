import {
  ParsedAccount,
  StringPublicKey,
  useConnection,
  useMeta,
  useUserAccounts,
  getSearchParams,
} from '@oyster/common';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';
import { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';
import { useWallet } from '@solana/wallet-adapter-react';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useParams, useLocation } from 'react-router';

import { SafetyDepositDraft } from '../../../actions/createAuctionManager';
import { useUserVouchersByEdition } from '../../artworks/hooks/useUserVouchersByEdition';
import openPack from '../actions/openPack';
import {
  PackMetadataByPackCard,
  useMetadataByPackCard,
} from '../hooks/useMetadataByPackCard';
import { useOpenedMetadata } from '../hooks/useOpenedMetadata';

type PackContextProps = {
  provingProcess?: ParsedAccount<ProvingProcess>,
  isLoading: boolean;
  packKey: StringPublicKey;
  voucherEditionKey: StringPublicKey;
  openedMetadata: SafetyDepositDraft[];
  cardsRedeemed: number;
  pack?: ParsedAccount<PackSet>;
  voucherMetadataKey?: StringPublicKey;
  metadataByPackCard: PackMetadataByPackCard;
  isProvingProcess: boolean;
  handleOpenPack: () => Promise<void>;
};

export const PackContext = React.createContext<PackContextProps>({
  isLoading: false,
  packKey: '',
  voucherEditionKey: '',
  openedMetadata: [],
  cardsRedeemed: 0,
  metadataByPackCard: {},
  isProvingProcess: false,
  handleOpenPack: () => Promise.resolve(),
});

export const PackProvider: React.FC = ({ children }) => {
  const wallet = useWallet();
  const connection = useConnection();
  const { packKey }: { packKey: string } = useParams();
  const { search } = useLocation();
  const { voucherEditionKey, provingProcessKey } = getSearchParams(search);

  const {
    packs,
    packCards,
    masterEditions,
    metadata,
    pullPackPage,
    provingProcesses,
    vouchers,
  } = useMeta();
  const { accountByMint, userAccounts } = useUserAccounts();
  const userVouchers = useUserVouchersByEdition();
  const metadataByPackCard = useMetadataByPackCard(packKey);

  const [isLoading, setIsLoading] = useState(false);

  const pack = packs[packKey];
  const provingProcess = provingProcesses[provingProcessKey];

  const cardsRedeemed = provingProcess?.info?.cardsRedeemed || 0;
  const openedMetadata = useOpenedMetadata(packKey, cardsRedeemed);

  const voucherMetadata = useMemo(
    () => metadata.find(meta => meta?.info?.edition === voucherEditionKey),
    [metadata, voucherEditionKey],
  );

  const voucher = useMemo(
    () =>
      Object.values(vouchers).find(
        voucher => voucher?.info?.packSet === packKey,
      ),
    [vouchers, packKey],
  );

  const voucherMetadataKey = voucherMetadata?.pubkey || voucher?.info?.metadata;
  const isProvingProcess = Boolean(provingProcessKey);

  const handleOpenPack = async () => {
    await openPack({
      pack,
      voucherEditionKey,
      provingProcess,
      userVouchers,
      accountByMint,
      connection,
      wallet,
      packCards,
      masterEditions,
      metadataByPackCard,
    });

    await handleFetch();
  };

  const handleFetch = async () => {
    setIsLoading(true);

    await pullPackPage(userAccounts, packKey);

    setIsLoading(false);
  };

  useEffect(() => {
    handleFetch();
  }, []);

  return (
    <PackContext.Provider
      value={{
        provingProcess,
        isLoading,
        packKey,
        voucherEditionKey,
        voucherMetadataKey,
        openedMetadata,
        pack,
        cardsRedeemed,
        metadataByPackCard,
        isProvingProcess,
        handleOpenPack,
      }}
    >
      {children}
    </PackContext.Provider>
  );
};

export const usePack = (): PackContextProps => {
  const context = useContext(PackContext);
  if (context === undefined) {
    throw new Error('usePack must be used within a PackProvider');
  }
  return context;
};
