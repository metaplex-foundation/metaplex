import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Progress,
  Space,
} from 'antd';
import { useMeta } from '../../contexts';
import {
  Store,
  WhitelistedCreator,
} from '@oyster/common/dist/lib/models/metaplex/index';
import {
  MasterEditionV1,
  notify,
  ParsedAccount,
  shortenAddress,
  StringPublicKey,
  useConnection,
  useStore,
  useUserAccounts,
  useWalletModal,
  WalletSigner,
  loadCreators,
  loadAuctionManagers,
  loadAuctionsForAuctionManagers,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import { saveAdmin } from '../../actions/saveAdmin';
import {
  convertMasterEditions,
  filterMetadata,
} from '../../actions/convertMasterEditions';
import { Link } from 'react-router-dom';
import { SetupVariables } from '../../components/SetupVariables';
import { cacheAllAuctions } from '../../actions';
import { LoadingOutlined } from '@ant-design/icons';
import { useAuctionManagersToCache, useNotifications } from '../../hooks';
import Bugsnag from '@bugsnag/browser';

const { Content } = Layout;
export const AdminView = () => {
  const { store, whitelistedCreatorsByCreator, isLoading, patchState } = useMeta();
  const connection = useConnection();
  const wallet = useWallet();
  const [loadingAdmin, setLoadingAdmin] = useState(true);
  const { setVisible } = useWalletModal();
  const connect = useCallback(
    () => (wallet.wallet ? wallet.connect().catch() : setVisible(true)),
    [wallet.wallet, wallet.connect, setVisible],
  );
  const { storeAddress, setStoreForOwner, isConfigured } = useStore();

  useEffect(() => {
    if (
      !store &&
      !storeAddress &&
      wallet.publicKey &&
      !process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS
    ) {
      setStoreForOwner(wallet.publicKey.toBase58());
    }
  }, [store, storeAddress, wallet.publicKey]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    (async () => {
      const [creatorsState, auctionManagerState] = await Promise.all([
        loadCreators(connection),
        loadAuctionManagers(connection, storeAddress as string),
      ])
      const auctionsState = await loadAuctionsForAuctionManagers(
        connection,
        Object.values(auctionManagerState.auctionManagersByAuction),
      )

      patchState(creatorsState, auctionManagerState, auctionsState);
      setLoadingAdmin(false);
    })()
  }, [loadingAdmin, isLoading, storeAddress])

  if (loadingAdmin) {
    return (
      <div className="app-section--loading">
        <Spin indicator={<LoadingOutlined />} />
      </div>
    )
  }

  return (
    <>
      {!wallet.connected ? (
        <p>
          <Button type="primary" className="app-btn" onClick={connect}>
            Connect
          </Button>{' '}
          to admin store.
        </p>
      ) : !storeAddress || isLoading ? (
        <Spin indicator={<LoadingOutlined />} />
      ) : store && wallet ? (
        <>
          <InnerAdminView
            store={store}
            whitelistedCreatorsByCreator={whitelistedCreatorsByCreator}
            connection={connection}
            wallet={wallet}
            connected={wallet.connected}
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
      <Button
        className="add-creator-button"
        onClick={() => setModalOpen(true)}
      >
        Add Creator
      </Button>
    </>
  );
}

enum ListingNotificationStatus {
  Ready,
  Submitting,
  Complete,
  Error,
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
  wallet: WalletSigner;
  connected: boolean;
}) {
  const [newStore, setNewStore] = useState(
    store && store.info && new Store(store.info),
  );
  const { storefront } = useStore()
  const [updatedCreators, setUpdatedCreators] = useState<
    Record<string, WhitelistedCreator>
  >({});
  const [filteredMetadata, setFilteredMetadata] =
    useState<{
      available: ParsedAccount<MasterEditionV1>[];
      unavailable: ParsedAccount<MasterEditionV1>[];
    }>();
  const [cachingAuctions, setCachingAuctions] = useState<boolean>();
  const [convertingMasterEditions, setConvertMasterEditions] = useState<boolean>();
  const {
    auctionCaches,
    storeIndexer,
    metadata,
    masterEditions,
  } = useMeta();
  const { auctionManagersToCache, auctionManagerTotal, auctionCacheTotal } = useAuctionManagersToCache();
  const notifications = useNotifications(wallet);

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
      <Col>
        <Row>
          <h2>Whitelisted Creators</h2>
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
          />
        </Row>
      </Col>
      <h2>Listing Notifications</h2>
      <Table
        columns={[
          {
            key: 'auctinManagerPubkey',
            title: 'Listing',
            dataIndex: 'auctionManagerPubkey'
          },
          {
            key: 'description',
            title: 'Notification',
            dataIndex: "description"
          },
          {
            key: 'action',
            title: 'Action',
            render: ({ action, callToAction }) => {
              const [status, setStatus] = useState<ListingNotificationStatus>(ListingNotificationStatus.Ready);

              const onSubmit = async () => {
                try {
                  setStatus(ListingNotificationStatus.Submitting);
                  await action();
                  setStatus(ListingNotificationStatus.Complete);
                } catch (e: any) {
                  Bugsnag.notify(e);
                  setStatus(ListingNotificationStatus.Error)
                }
              }
              const isComplete = status === ListingNotificationStatus.Complete;

              const label = isComplete ? 'Done' : callToAction
              return (
                <Button
                  loading={status === ListingNotificationStatus.Submitting}
                  disabled={isComplete}
                  onClick={onSubmit}
                >
                  {label}
                </Button>
              )
            }
          }
        ]}
        dataSource={notifications}
      />
      <Row>
      </Row>
      <h2>Adminstrator Actions</h2>
      <Row>
        {!store.info.public && (
          <Col xs={24} md={12}>
            <h3>Convert Master Editions</h3>
            <p>
              You have {filteredMetadata?.available.length} MasterEditionV1s that
              can be converted right now and{' '}
              {filteredMetadata?.unavailable.length} still in unfinished auctions
              that cannot be converted yet.
            </p>
            <Button
              size="large"
              loading={convertingMasterEditions}
              onClick={async () => {
                setConvertMasterEditions(true);

                await convertMasterEditions(
                  connection,
                  wallet,
                  filteredMetadata?.available || [],
                  accountByMint,
                );

                setConvertMasterEditions(false);
              }}
            >
              Convert Eligible Master Editions
            </Button>
          </Col>
        )
        }
        <Col span={11} offset={1}>
          <h3>Cache Auctions</h3>
          <p>Activate your storefront listing caches by pressing "build cache". This will reduce page load times for your listings. Your storefront will start looking up listing using the cache on October 29th. To preview the speed improvement visit the Holaplex <a rel="noopener noreferrer" target="_blank" href={`https://${storefront.subdomain}.holaxplex.dev`}> staging environment</a> for your storefront.</p>
          <Space direction="vertical" size="middle" align="center">
            <Progress type="circle" percent={auctionCacheTotal / auctionManagerTotal * 100} format={() => `${auctionManagersToCache.length} left`} />
            {auctionManagersToCache.length > 0 && (
              <Button
                size="large"
                loading={cachingAuctions}
                onClick={async () => {
                  setCachingAuctions(true);

                  await cacheAllAuctions(
                    wallet,
                    connection,
                    auctionManagersToCache,
                    auctionCaches,
                    storeIndexer,
                  );

                  setCachingAuctions(false);
                }}
              >
                Build Cache
              </Button>
            )}
          </Space>
        </Col>
      </Row>
    </Content>
  );
}
