import React, { useContext, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { AccountInfo } from '@solana/web3.js';

import { useConnection } from '../ConnectionContext';

const AccountsContext = React.createContext<any>(null);

export const useAccountsContext = () => {
  const context = useContext(AccountsContext);

  return context;
};

export const useNativeAccount = () => {
  const connection = useConnection();
  const { publicKey } = useWallet();

  const [nativeAccount, setNativeAccount] = useState<AccountInfo<Buffer>>();

  useEffect(() => {
    let subId = 0;
    const updateAccount = (account: AccountInfo<Buffer> | null) => {
      if (account) {
        setNativeAccount(account);
      }
    };

    (async () => {
      if (!connection || !publicKey) {
        return;
      }

      const account = await connection.getAccountInfo(publicKey);
      updateAccount(account);

      subId = connection.onAccountChange(publicKey, updateAccount);
    })();

    return () => {
      if (subId) {
        connection.removeAccountChangeListener(subId);
      }
    };
  }, [setNativeAccount, publicKey, connection]);

  return { account: nativeAccount };
};

