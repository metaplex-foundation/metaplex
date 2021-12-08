import {
  useConnection,
  useMeta,
  useUserAccounts,
  getSearchParams,
  ParsedAccount,
} from '@oyster/common';
import { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';
import { useWallet } from '@solana/wallet-adapter-react';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useParams, useLocation } from 'react-router';

import { useUserVouchersByEdition } from '../../artworks/hooks/useUserVouchersByEdition';
import { claimPackCards } from '../transactions/claimPackCards';

import { getProvingProcess } from './utils/getProvingProcess';
import { getInitialProvingProcess } from './utils/getInitialProvingProcess';
import { useMetadataByPackCard } from './hooks/useMetadataByPackCard';
import { useOpenedMetadata } from './hooks/useOpenedMetadata';

import { PackContextProps } from './interface';
import { fetchProvingProcessWithRetry } from './utils/fetchProvingProcessWithRetry';

export const PackContext = React.createContext<PackContextProps>({
  isLoading: false,
  packKey: '',
  voucherEditionKey: '',
  openedMetadata: [],
  metadataByPackCard: {},
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

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [provingProcess, setProvingProcess] =
    useState<ParsedAccount<ProvingProcess>>();

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

  const cardsRedeemed = provingProcess?.info?.cardsRedeemed || 0;
  const pack = packs[packKey];
  const voucherMetadataKey = voucherMetadata?.pubkey || voucher?.info?.metadata;

  const openedMetadata = useOpenedMetadata(packKey, cardsRedeemed);

  const handleOpenPack = async () => {
    const newProvingProcess = await getProvingProcess({
      pack,
      voucherEditionKey,
      provingProcessKey,
      userVouchers,
      accountByMint,
      connection,
      wallet,
    });
    setProvingProcess(newProvingProcess);

    const {
      info: { cardsToRedeem, voucherMint },
      pubkey,
    } = newProvingProcess;

    await claimPackCards({
      wallet,
      connection,
      voucherMint,
      cardsToRedeem,
      metadataByPackCard,
      packCards,
      masterEditions,
      pack,
    });

    const resultingProvingProcess = await fetchProvingProcessWithRetry({
      provingProcessKey: pubkey,
      connection,
    });

    setProvingProcess(resultingProvingProcess);
  };

  const handleFetch = async () => {
    setIsLoading(true);

    await pullPackPage(userAccounts, packKey);

    const initialProvingProcess = getInitialProvingProcess({
      provingProcesses,
      provingProcessKey,
      voucherMetadata,
    });

    if (initialProvingProcess) {
      setProvingProcess(initialProvingProcess);
    }

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
        voucherMetadataKey,
        openedMetadata,
        pack,
        metadataByPackCard,
        handleOpenPack,
        provingProcess,
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
