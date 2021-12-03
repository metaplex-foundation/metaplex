import {
  Metadata,
  ParsedAccount,
  StringPublicKey,
  useConnection,
  useMeta,
  useUserAccounts,
  getSearchParams,
} from '@oyster/common';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';
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
  isLoading: boolean;
  packKey: StringPublicKey;
  voucherEditionKey: StringPublicKey;
  openedMetadata: SafetyDepositDraft[];
  cardsRedeemed: number;
  pack?: ParsedAccount<PackSet>;
  voucherMetadata?: ParsedAccount<Metadata>;
  metadataByPackCard: PackMetadataByPackCard;
  handleOpenPack: () => Promise<void>;
};

export const PackContext = React.createContext<PackContextProps>({
  isLoading: false,
  packKey: '',
  voucherEditionKey: '',
  openedMetadata: [],
  cardsRedeemed: 0,
  metadataByPackCard: {},
  handleOpenPack: () => Promise.resolve(),
});

export const PackProvider: React.FC = ({ children }) => {
  const wallet = useWallet();
  const connection = useConnection();
  const { packKey }: { packKey: string } = useParams();
  const { search } = useLocation();
  const { voucherEditionKey } = getSearchParams(search);

  const { packs, packCards, masterEditions, metadata, pullPackPage } =
    useMeta();
  const { accountByMint, userAccounts } = useUserAccounts();
  const userVouchers = useUserVouchersByEdition();
  const metadataByPackCard = useMetadataByPackCard(packKey);

  const [isLoading, setIsLoading] = useState(false);

  const pack = packs[packKey];
  const cardsRedeemed = 0;

  const openedMetadata = useOpenedMetadata(packKey, cardsRedeemed);

  const voucherMetadata = useMemo(
    () => metadata.find(meta => meta?.info?.edition === voucherEditionKey),
    [metadata, voucherEditionKey],
  );

  const handleOpenPack = async () => {
    await openPack({
      pack,
      voucherEditionKey,
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
        isLoading,
        packKey,
        voucherEditionKey,
        voucherMetadata,
        openedMetadata,
        pack,
        cardsRedeemed,
        metadataByPackCard,
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
