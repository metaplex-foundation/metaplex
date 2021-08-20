import React, { useEffect, useMemo, useState } from 'react';
import {
  Layout,
  Row,
  Col,
  Table,
  Switch,
  Spin,
  Modal,
  Button,
  Input,
  Divider,
} from 'antd';
import { useMeta } from '../../contexts';
import { Store, WhitelistedCreator } from '../../models/metaplex';
import {
  MasterEditionV1,
  notify,
  ParsedAccount,
  shortenAddress,
  StringPublicKey,
  useConnection,
  useStore,
  useUserAccounts,
  useWallet,
} from '@oyster/common';
import { Connection } from '@solana/web3.js';
import { saveAdmin } from '../../actions/saveAdmin';
import { WalletAdapter } from '@solana/wallet-base';
import {
  convertMasterEditions,
  filterMetadata,
} from '../../actions/convertMasterEditions';
import { Link } from 'react-router-dom';
import { SetupVariables } from '../../components/SetupVariables';

const { Content } = Layout;
export const AdminView = () => {
  const { store, whitelistedCreatorsByCreator, isLoading } = useMeta();
  const connection = useConnection();
  const { wallet, connected, connect } = useWallet();
  const { storeAddress, setStoreForOwner, isConfigured } = useStore();

  useEffect(() => {
    if (!store && !storeAddress && connected && wallet?.publicKey) {
      setStoreForOwner(wallet?.publicKey?.toBase58());
    }
  }, [store, storeAddress, connected, wallet?.publicKey]);
  console.log('@admin', connected, storeAddress, isLoading, store);

  return (
    <>
      {!connected ? (
        <p>
          <Button type="primary" className="app-btn" onClick={connect}>
            Connect
          </Button>{' '}
          to admin store.
        </p>
      ) : !storeAddress || isLoading ? (
        <Spin />
      ) : store && wallet ? (
        <>
          <InnerAdminView
            store={store}
            whitelistedCreatorsByCreator={whitelistedCreatorsByCreator}
            connection={connection}
            wallet={wallet}
            connected={connected}
          />
          {!isConfigured && (
            <>
              <Divider />
              <Divider />
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
      ) : (
        <>
          <p>Store is not initialized</p>
          <Link to={`/`}>Go to initialize</Link>
        </>
      )}
    </>
  );
};

function ArtistModal({
  setUpdatedCreators,
  uniqueCreatorsWithUpdates,
}: {
  setUpdatedCreators: React.Dispatch<
    React.SetStateAction<Record<string, WhitelistedCreator>>
  >;
  uniqueCreatorsWithUpdates: Record<string, WhitelistedCreator>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAddress, setModalAddress] = useState<string>('');
  return (
    <>
      <Modal
        title="Add New Artist Address"
        visible={modalOpen}
        onOk={() => {
          const addressToAdd = modalAddress;
          setModalAddress('');
          setModalOpen(false);

          if (uniqueCreatorsWithUpdates[addressToAdd]) {
            notify({
              message: 'Artist already added!',
              type: 'error',
            });
            return;
          }

          let address: StringPublicKey;
          try {
            address = addressToAdd;
            setUpdatedCreators(u => ({
              ...u,
              [modalAddress]: new WhitelistedCreator({
                address,
                activated: true,
              }),
            }));
          } catch {
            notify({
              message: 'Only valid Solana addresses are supported',
              type: 'error',
            });
          }
        }}
        onCancel={() => {
          setModalAddress('');
          setModalOpen(false);
        }}
      >
        <Input
          value={modalAddress}
          onChange={e => setModalAddress(e.target.value)}
        />
      </Modal>
      <Button onClick={() => setModalOpen(true)}>Add Creator</Button>
    </>
  );
}

function InnerAdminView({
  store,
  whitelistedCreatorsByCreator,
  connection,
  wallet,
  connected,
}: {
  store: ParsedAccount<Store>;
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >;
  connection: Connection;
  wallet: WalletAdapter;
  connected: boolean;
}) {
  const [newStore, setNewStore] = useState(
    store && store.info && new Store(store.info),
  );
  const [updatedCreators, setUpdatedCreators] = useState<
    Record<string, WhitelistedCreator>
  >({});
  const [filteredMetadata, setFilteredMetadata] =
    useState<{
      available: ParsedAccount<MasterEditionV1>[];
      unavailable: ParsedAccount<MasterEditionV1>[];
    }>();
  const [loading, setLoading] = useState<boolean>();
  const { metadata, masterEditions } = useMeta();

  const { accountByMint } = useUserAccounts();
  useMemo(() => {
    const fn = async () => {
      setFilteredMetadata(
        await filterMetadata(
          connection,
          metadata,
          masterEditions,
          accountByMint,
        ),
      );
    };
    fn();
  }, [connected]);

  const uniqueCreators = Object.values(whitelistedCreatorsByCreator).reduce(
    (acc: Record<string, WhitelistedCreator>, e) => {
      acc[e.info.address] = e.info;
      return acc;
    },
    {},
  );

  const uniqueCreatorsWithUpdates = { ...uniqueCreators, ...updatedCreators };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      render: (val: StringPublicKey) => <span>{val}</span>,
      key: 'address',
    },
    {
      title: 'Activated',
      dataIndex: 'activated',
      key: 'activated',
      render: (
        value: boolean,
        record: {
          address: StringPublicKey;
          activated: boolean;
          name: string;
          key: string;
        },
      ) => (
        <Switch
          checkedChildren="Active"
          unCheckedChildren="Inactive"
          checked={value}
          onChange={val =>
            setUpdatedCreators(u => ({
              ...u,
              [record.key]: new WhitelistedCreator({
                activated: val,
                address: record.address,
              }),
            }))
          }
        />
      ),
    },
  ];

  return (
    <Content>
      <Col style={{ marginTop: 10 }}>
        <Row>
          <Col span={21}>
            <ArtistModal
              setUpdatedCreators={setUpdatedCreators}
              uniqueCreatorsWithUpdates={uniqueCreatorsWithUpdates}
            />
            <Button
              onClick={async () => {
                notify({
                  message: 'Saving...',
                  type: 'info',
                });
                await saveAdmin(
                  connection,
                  wallet,
                  newStore.public,
                  Object.values(updatedCreators),
                );
                notify({
                  message: 'Saved',
                  type: 'success',
                });
              }}
              type="primary"
            >
              Submit
            </Button>
          </Col>
          <Col span={3}>
            <Switch
              checkedChildren="Public"
              unCheckedChildren="Whitelist Only"
              checked={newStore.public}
              onChange={val => {
                setNewStore(_ => {
                  const newS = new Store(store.info);
                  newS.public = val;
                  return newS;
                });
              }}
            />
          </Col>
        </Row>
        <Row>
          <Table
            className="artist-whitelist-table"
            columns={columns}
            dataSource={Object.keys(uniqueCreatorsWithUpdates).map(key => ({
              key,
              address: uniqueCreatorsWithUpdates[key].address,
              activated: uniqueCreatorsWithUpdates[key].activated,
              name:
                uniqueCreatorsWithUpdates[key].name ||
                shortenAddress(uniqueCreatorsWithUpdates[key].address),
              image: uniqueCreatorsWithUpdates[key].image,
            }))}
          ></Table>
        </Row>
      </Col>

      {!store.info.public && (
        <>
          <h1>
            You have {filteredMetadata?.available.length} MasterEditionV1s that
            can be converted right now and{' '}
            {filteredMetadata?.unavailable.length} still in unfinished auctions
            that cannot be converted yet.
          </h1>
          <Col>
            <Row>
              <Button
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  await convertMasterEditions(
                    connection,
                    wallet,
                    filteredMetadata?.available || [],
                    accountByMint,
                  );
                  setLoading(false);
                }}
              >
                {loading ? (
                  <Spin />
                ) : (
                  <span>Convert Eligible Master Editions</span>
                )}
              </Button>
            </Row>
          </Col>{' '}
        </>
      )}
    </Content>
  );
}
