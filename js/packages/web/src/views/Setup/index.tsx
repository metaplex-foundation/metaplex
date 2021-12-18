import {
  useConnection,
  useStore,
  useWalletModal,
  WhitelistedCreator,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button, Card, Row, Col, Space } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveAdmin } from '../../actions/saveAdmin';
import { SetupVariables } from '../../components/SetupVariables';
import { useMeta } from '../../contexts';

export const SetupView = () => {
  const [isInitalizingStore, setIsInitalizingStore] = useState(false);
  const connection = useConnection();
  const { store } = useMeta();
  const { setStoreForOwner } = useStore();
  const navigate = useNavigate();
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const connect = useCallback(
    () => (wallet.wallet ? wallet.connect().catch() : setVisible(true)),
    [wallet.wallet, wallet.connect, setVisible],
  );
  const [storeAddress, setStoreAddress] = useState<string | undefined>();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS) {
      const getStore = async () => {
        if (wallet.publicKey) {
          const store = await setStoreForOwner(wallet.publicKey.toBase58());
          setStoreAddress(store);
        } else {
          setStoreAddress(undefined);
        }
      };
      getStore();
    }
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
    ]);

    // TODO: process errors

    await setStoreForOwner(undefined);
    await setStoreForOwner(wallet.publicKey.toBase58());

    navigate('/admin');
  };

  return (
    <Row justify="center">
      <Col xs={24} md={18} lg={14}>
        <Card>
          <Row>
            <Col xs={24}>
              <Space direction="horizontal">
                {!wallet.connected && (
                  <p>
                    <Button type="primary" onClick={connect}>
                      Connect
                    </Button>{' '}
                    to configure store.
                  </p>
                )}
                {wallet.connected && !store && (
                  <>
                    <h3>Store is not initialized yet</h3>
                    <p>There must be some ◎ SOL in the wallet before initialization. After initialization, you will be able to manage the list of creators.</p>

                    <Button
                      type="primary"
                      loading={isInitalizingStore}
                      onClick={initializeStore}
                    >
                      Init Store
                    </Button>
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
              </Space>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};
