import React, { useState } from 'react';
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
} from 'antd';
import { useMeta } from '../../contexts';
import { Store, WhitelistedCreator } from '../../models/metaplex';
import {
  notify,
  ParsedAccount,
  shortenAddress,
  useConnection,
  useWallet,
} from '@oyster/common';
import { Connection, PublicKey } from '@solana/web3.js';
import { saveAdmin } from '../../actions/saveAdmin';
import { WalletAdapter } from '@solana/wallet-base';

const { Content } = Layout;
export const AdminView = () => {
  const { store, whitelistedCreatorsByCreator } = useMeta();
  const connection = useConnection();
  const { wallet } = useWallet();

  return store && connection && wallet ? (
    <InnerAdminView
      store={store}
      whitelistedCreatorsByCreator={whitelistedCreatorsByCreator}
      connection={connection}
      wallet={wallet}
    />
  ) : (
    <Spin />
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

          let address: PublicKey;
          try {
            address = new PublicKey(addressToAdd);
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
}: {
  store: ParsedAccount<Store>;
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >;
  connection: Connection;
  wallet: WalletAdapter;
}) {
  const [newStore, setNewStore] = useState(
    store && store.info && new Store(store.info),
  );
  const [updatedCreators, setUpdatedCreators] = useState<
    Record<string, WhitelistedCreator>
  >({});

  if (!store || !newStore) {
    return <p>Store is not defined</p>;
  }

  const uniqueCreators = Object.values(whitelistedCreatorsByCreator).reduce(
    (acc: Record<string, WhitelistedCreator>, e) => {
      acc[e.info.address.toBase58()] = e.info;
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
      render: (val: PublicKey) => <span>{val.toBase58()}</span>,
      key: 'address',
    },
    {
      title: 'Activated',
      dataIndex: 'activated',
      key: 'activated',
      render: (
        value: boolean,
        record: {
          address: PublicKey;
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
                shortenAddress(
                  uniqueCreatorsWithUpdates[key].address.toBase58(),
                ),
              image: uniqueCreatorsWithUpdates[key].image,
            }))}
          ></Table>
        </Row>
      </Col>
    </Content>
  );
}
