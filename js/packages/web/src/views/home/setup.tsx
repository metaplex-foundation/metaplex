import { useConnection, useStore, useWallet } from '@oyster/common';
import { Button } from 'antd';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { saveAdmin } from '../../actions/saveAdmin';
import { useMeta } from '../../contexts';
import { WhitelistedCreator } from '../../models/metaplex';
import { SetupVariables } from '../../components/SetupVariables';

export const SetupView = () => {
  const [isInitalizingStore, setIsInitalizingStore] = useState(false);
  const connection = useConnection();
  const { store } = useMeta();
  const { setStoreForOwner } = useStore();
  const history = useHistory();
  const { wallet, connected, connect } = useWallet();
  const [storeAddress, setStoreAddress] = useState<string | undefined>();

  useEffect(() => {
    const getStore = async () => {
      if (connected && wallet) {
        const store = await setStoreForOwner(wallet?.publicKey?.toBase58());
        setStoreAddress(store);
      } else {
        setStoreAddress(undefined);
      }
    };
    getStore();
  }, [wallet?.publicKey, connected]);

  const initializeStore = async () => {
    if (!wallet?.publicKey) {
      return;
    }

    setIsInitalizingStore(true);

    await saveAdmin(connection, wallet, false, [
      new WhitelistedCreator({
        address: wallet.publicKey.toBase58(),
        activated: true,
      }),
    ]);

    // TODO: process errors

    // Fack to reload meta
    await setStoreForOwner(undefined);
    await setStoreForOwner(wallet?.publicKey?.toBase58());

    history.push('/admin');
  };

  return (
    <>
      {!connected && (
        <p>
          <Button type="primary" className="app-btn" onClick={connect}>
            Connect
          </Button>{' '}
          to configure store.
        </p>
      )}
      {connected && !store && (
        <>
          <p>Store is not initialized yet</p>
          <p>There must be some ◎ SOL in the wallet before initialization.</p>
          <p>
            After initialization, you will be able to manage the list of
            creators
          </p>

          <p>
            <Button
              className="app-btn"
              type="primary"
              loading={isInitalizingStore}
              onClick={initializeStore}
            >
              Init Store
            </Button>
          </p>
        </>
      )}
      {connected && store && (
        <>
          <p>
            To finish initialization please copy config below into{' '}
            <b>packages/web/.env</b> and restart yarn or redeploy
          </p>
          <SetupVariables
            storeAddress={storeAddress}
            storeOwnerAddress={wallet?.publicKey?.toBase58()}
          />
        </>
      )}
    </>
  );
};
