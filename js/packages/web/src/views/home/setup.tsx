import {
  useConnection,
  useStore,
  useWalletModal,
  WhitelistedCreator,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import {Button, Row} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { saveAdmin } from '../../actions/saveAdmin';
import { useMeta } from '../../contexts';
import { SetupVariables } from '../../components/SetupVariables';
import { GatekeeperNetworkSelection } from "../../contexts/gatekeeperNetwork";
import { GatewayDescriptionText } from "../../components/gateway/GatewayDescriptionText";
import { GatewayRulesetComponent } from "../../components/gateway/GatewayRulesetComponent";

export const SetupView = () => {
  const [isInitalizingStore, setIsInitalizingStore] = useState(false);
  const connection = useConnection();
  const { store } = useMeta();
  const { setStoreForOwner } = useStore();
  const history = useHistory();
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const connect = useCallback(
    () => (wallet.wallet ? wallet.connect().catch() : setVisible(true)),
    [wallet.wallet, wallet.connect, setVisible],
  );
  const [storeAddress, setStoreAddress] = useState<string | undefined>();
  const [gatekeeperNetwork, setGatekeeperNetwork] = useState<GatekeeperNetworkSelection|undefined>();

  useEffect(() => {
    const getStore = async () => {
      if (wallet.publicKey) {
        const store = await setStoreForOwner(wallet.publicKey.toBase58());
        setStoreAddress(store);
      } else {
        setStoreAddress(undefined);
      }
    };
    getStore();
  }, [wallet.publicKey]);

  const initializeStore = async () => {
    if (!wallet.publicKey) {
      return;
    }

    setIsInitalizingStore(true);

    await saveAdmin(connection, wallet, false, [
        new WhitelistedCreator({
          address: wallet.publicKey.toBase58(),
          activated: true,
        }),
      ],
      gatekeeperNetwork?.publicKey
    );

    // TODO: process errors

    await setStoreForOwner(undefined);
    await setStoreForOwner(wallet.publicKey.toBase58());

    history.push('/admin');
  };

  return (
    <>
      {!wallet.connected && (
        <p>
          <Button type="primary" className="app-btn" onClick={connect}>
            Connect
          </Button>{' '}
          to configure store.
        </p>
      )}
      {wallet.connected && !store && (
        <>
          <Row className="call-to-action init-store-row" style={{ marginBottom: 20 }}>
            <h2>Initialize Store</h2>
            <p>Store is not initialized yet</p>
            <p>There must be some ◎ SOL in the wallet before initialization.</p>
            <p>
              After initialization, you will be able to manage the list of
              creators
            </p>
          </Row>
          <GatewayDescriptionText/>
          <GatewayRulesetComponent setGatekeeperNetwork={setGatekeeperNetwork}/>
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
      {wallet.connected && store && (
        <>
          <p>
            To finish initialization please copy config below into{' '}
            <b>packages/web/.env</b> and restart yarn or redeploy
          </p>
          <SetupVariables
            storeAddress={storeAddress}
            storeOwnerAddress={wallet.publicKey?.toBase58()}
          />
        </>
      )}
    </>
  );
};
