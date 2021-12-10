import { useMeta, useUserAccounts } from '@oyster/common';
import { useEffect, useRef, useState } from 'react';

export const useListenForTokenAccounts = () => {
  const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(false);
  const { pullUserMetadata } = useMeta();
  const { userAccounts } = useUserAccounts();

  const previousTokenAccountsLength = useRef<number>(0);

  const fetchMetadata = async () => {
    if (isLoadingMetadata) {
      return;
    }

    setIsLoadingMetadata(true);

    const accountsToLoad = userAccounts.slice(
      previousTokenAccountsLength.current,
    );

    // Store the length of array we loaded to not load same items the next time
    // We can be sure userAccounts order is always the same
    previousTokenAccountsLength.current = userAccounts.length;

    await pullUserMetadata(accountsToLoad);

    setIsLoadingMetadata(false);
  };

  useEffect(() => {
    fetchMetadata();
  }, [userAccounts.length]);
};
