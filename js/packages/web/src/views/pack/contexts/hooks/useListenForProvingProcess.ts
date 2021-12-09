import {
  Metadata,
  ParsedAccount,
  StringPublicKey,
  useConnection,
} from '@oyster/common';
import { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';
import { useState } from 'react';
import useInterval from '../../../../hooks/useInterval';
import { fetchProvingProcessWithRetry } from '../utils/fetchProvingProcessWithRetry';

type MetadataWithProbability = ParsedAccount<Metadata> & {
  probability: string;
};
export type PackMetadataByPackCard = Record<string, MetadataWithProbability>;

const INTERVAL = 2000;

export const useListenForProvingProcess = (
  shouldListen: boolean,
  provingProcessKey?: StringPublicKey,
) => {
  const [provingProcess, setProvingProcess] =
    useState<ParsedAccount<ProvingProcess>>();
  const [isLoadingProvingProcess, setIsLoadingProvingProcess] =
    useState<boolean>(false);

  const connection = useConnection();

  const fetchProvingProcess = async () => {
    if (isLoadingProvingProcess || !provingProcessKey) {
      return;
    }

    setIsLoadingProvingProcess(true);

    const newProvingProcess = await fetchProvingProcessWithRetry({
      provingProcessKey: provingProcessKey,
      connection,
    });

    setProvingProcess(newProvingProcess);
    setIsLoadingProvingProcess(false);
  };

  useInterval(
    () => {
      fetchProvingProcess();
    },
    shouldListen ? INTERVAL : null,
    true,
  );

  return provingProcess;
};
