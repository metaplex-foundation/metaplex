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

import { useUserVouchersByEdition } from './hooks/useUserVouchersByEdition';
import { claimPackCards } from '../transactions/claimPackCards';

import { getProvingProcess } from './utils/getProvingProcess';
import { getMetadataUserToReceive } from './utils/getMetadataUserToReceive';
import { getInitialProvingProcess } from './utils/getInitialProvingProcess';
import { useMetadataByPackCard } from './hooks/useMetadataByPackCard';
import { useOpenedMetadata } from './hooks/useOpenedMetadata';

import { PackContextProps } from './interface';
import { useListenForProvingProcess } from './hooks/useListenForProvingProcess';
import { fetchProvingProcessWithRetry } from './utils/fetchProvingProcessWithRetry';
import { useListenForTokenAccounts } from './hooks/useListenForTokenAccounts';

export const PackContext = React.createContext<PackContextProps>({
  isLoading: false,
  packKey: '',
  voucherEditionKey: '',
  openedMetadata: [],
  metadataByPackCard: {},
  handleOpenPack: () => Promise.resolve(),
  redeemModalMetadata: [],
});

export const PackProvider: React.FC = ({ children }) => {
  const wallet = useWallet();
  const connection = useConnection();
  const { packKey }: { packKey: string } = useParams();
  const { search } = useLocation();
  const { voucherEditionKey, provingProcessKey } = getSearchParams(search);

  useListenForTokenAccounts();

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
  const [isPollingProvingProcess, setIsPollingProvingProcess] =
    useState<boolean>(false);

  const [provingProcess, setProvingProcess] =
    useState<ParsedAccount<ProvingProcess>>();
  const [redeemModalMetadata, setRedeemModalMetadata] = useState<string[]>([]);

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
  // Listens for updates on proving process while pack is being opened
  const updatedProvingProcess = useListenForProvingProcess(
    isPollingProvingProcess,
    provingProcess?.pubkey,
  );

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

    const metadataUserToReceive = await getMetadataUserToReceive({
      cardsToRedeem,
      metadataByPackCard,
      packPubKey: pack.pubkey,
    });
    setRedeemModalMetadata(metadataUserToReceive);

    // Starts proving process polling
    setIsPollingProvingProcess(true);

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

    setIsPollingProvingProcess(false);

    // Fetch final proving process state
    // Because polling can be terminated too soon
    const resultingProvingProcess = await fetchProvingProcessWithRetry({
      provingProcessKey: pubkey,
      connection,
    });

    setProvingProcess(resultingProvingProcess);
  };

  const handleFetch = async () => {
    setIsLoading(true);

    setRedeemModalMetadata([]);

    await pullPackPage(userAccounts, packKey);

    const initialProvingProcess = getInitialProvingProcess({
      provingProcesses,
      provingProcessKey,
      voucherMetadata,
    });

    if (initialProvingProcess) {
      setProvingProcess(initialProvingProcess);
    } else {
      setProvingProcess(undefined);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    setProvingProcess(updatedProvingProcess);
  }, [updatedProvingProcess]);

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
        redeemModalMetadata,
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
