import { ParsedAccount, useConnection, useMeta } from '@oyster/common';
import {
  decodePackCard,
  getCardsByPackSet,
  PackCard,
} from '@oyster/common/dist/lib/models/packs/accounts/PackCard';
import {
  decodePackProvingProcess,
  getProvingProcessByVoucherMint,
  ProvingProcess,
} from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';
import { Connection } from '@solana/web3.js';
import { useEffect, useMemo, useState } from 'react';
import { SafetyDepositDraft } from '../../../actions/createAuctionManager';
import { useUserVouchersByEdition } from '../../artworks/hooks/useUserVouchersByEdition';
import { useOpenedMetadata } from './useOpenedMetadata';

const fetchProvingProcess = async (
  connection: Connection,
  voucherMint: string,
): Promise<ParsedAccount<ProvingProcess>[]> => {
  const encodedProvingProcess = await getProvingProcessByVoucherMint({
    connection,
    voucherMint,
  });

  const provingProcess: ParsedAccount<ProvingProcess>[] =
    encodedProvingProcess.map(({ pubkey, account }) => ({
      pubkey,
      account,
      info: decodePackProvingProcess(account.data),
    }));

  return provingProcess;
};

const fetchCards = async (
  connection: Connection,
  packSet: string,
): Promise<ParsedAccount<PackCard>[]> => {
  const encodedCards = await getCardsByPackSet({ connection, packSet });

  const cards: ParsedAccount<PackCard>[] = encodedCards.map(
    ({ pubkey, account }) => ({
      pubkey,
      account,
      info: decodePackCard(account.data),
    }),
  );

  return cards;
};

export const usePackState = (
  packKey: string,
  voucherKey?: string,
): {
  packMetadata: SafetyDepositDraft[];
  mockBlocks: number[];
  isLoading: boolean;
  provingProcess?: ParsedAccount<ProvingProcess>;
  handleStatusFetch: () => Promise<void>;
} => {
  const [isLoading, setIsLoading] = useState(false);
  const [packCards, setPackCards] = useState<ParsedAccount<PackCard>[]>([]);
  const [provingProcess, setProvingProcess] =
    useState<ParsedAccount<ProvingProcess>>();
  const { packs } = useMeta();

  const userVouchers = useUserVouchersByEdition();
  const connection = useConnection();
  const metadata = useOpenedMetadata(packCards);

  const pack = packs[packKey];
  const voucher = userVouchers[voucherKey || ''];

  const cardsRedeemed = provingProcess?.info.cardsRedeemed || 0;
  const total = pack?.info?.allowedAmountToRedeem || 0;
  const cardsLeftToOpen = total - cardsRedeemed;
  const mockBlocks = useMemo(
    () => Array.from({ length: cardsLeftToOpen }, (v, i) => i + cardsRedeemed),
    [cardsLeftToOpen, cardsRedeemed],
  );
  const packMetadata = cardsRedeemed ? metadata.slice(0, cardsRedeemed) : [];

  const handleStatusFetch = async () => {
    if (!voucher) return;

    const packProvingProcess = await fetchProvingProcess(
      connection,
      voucher.mint,
    );

    if (packProvingProcess.length > 0) {
      setProvingProcess(packProvingProcess[0]);
    }
  };

  const handleFetch = async () => {
    setIsLoading(true);

    const cards = await fetchCards(connection, packKey);
    setPackCards(cards);

    await handleStatusFetch();

    setIsLoading(false);
  };

  useEffect(() => {
    handleFetch();
  }, []);

  return {
    mockBlocks,
    packMetadata,
    provingProcess,
    isLoading,
    handleStatusFetch,
  };
};
