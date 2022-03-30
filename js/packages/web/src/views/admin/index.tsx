import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Layout, Table, Switch, Spin, Modal, Input } from 'antd'
import { Button } from '@oyster/common'
import { useMeta } from '../../contexts'
import { Store, WhitelistedCreator } from '@oyster/common/dist/lib/models/metaplex/index'
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
} from '@oyster/common'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection } from '@solana/web3.js'
import { saveAdmin } from '../../actions/saveAdmin'
import { convertMasterEditions, filterMetadata } from '../../actions/convertMasterEditions'
import { Link } from 'react-router-dom'
import { SetupVariables } from '../../components/SetupVariables'
import { cacheAllAuctions } from '../../actions/cacheAllAuctions'

const { Content } = Layout
export const AdminView = () => {
  const { store, whitelistedCreatorsByCreator, isLoading } = useMeta()
  const connection = useConnection()
  const wallet = useWallet()
  const { setVisible } = useWalletModal()
  const connect = useCallback(
    () => (wallet.wallet ? wallet.connect().catch() : setVisible(true)),
    [wallet.wallet, wallet.connect, setVisible]
  )
  const { storeAddress, setStoreForOwner, isConfigured } = useStore()
  const { publicKey } = useWallet()
  const pubKey = publicKey?.toBase58() || ''
  const storeOwnerAddress = process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS

  const isStoreOwner = useMemo(() => {
    if (whitelistedCreatorsByCreator[pubKey] !== undefined) {
      return whitelistedCreatorsByCreator[pubKey].info.address === storeOwnerAddress
    } else {
      return false
    }
  }, [whitelistedCreatorsByCreator, pubKey])

  useEffect(() => {
    if (
      !store &&
      !storeAddress &&
      wallet.publicKey &&
      !process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS
    ) {
      setStoreForOwner(wallet.publicKey.toBase58())
    }
  }, [store, storeAddress, wallet.publicKey])
  console.log('@admin', wallet.connected, storeAddress, isLoading, store)

  return (
    <>
      {!wallet.connected ? (
        <div className='container py-[80px]'>
          <p className='flex items-center gap-[16px]'>
            <Button isRounded={false} appearance='neutral' onClick={connect}>
              Connect
            </Button>
            <span>to admin store.</span>
          </p>
        </div>
      ) : !storeAddress || isLoading ? (
        <Spin />
      ) : store && wallet ? (
        <>
          {isStoreOwner ? (
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
                  <div className='container flex flex-col gap-[16px] py-[80px]'>
                    <p>
                      To finish initialization please copy config below into{' '}
                      <b>packages/web/.env</b> and restart yarn or redeploy
                    </p>
                    <SetupVariables
                      storeAddress={storeAddress}
                      storeOwnerAddress={wallet.publicKey?.toBase58()}
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <p>Not a store owner account</p>
              <Link to={`/`}>Go to initialize</Link>
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
  )
}

function ArtistModal({
  setUpdatedCreators,
  uniqueCreatorsWithUpdates,
}: {
  setUpdatedCreators: React.Dispatch<React.SetStateAction<Record<string, WhitelistedCreator>>>
  uniqueCreatorsWithUpdates: Record<string, WhitelistedCreator>
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAddress, setModalAddress] = useState<string>('')
  return (
    <>
      <Modal
        className={'modal-box'}
        title='Add New Artist Address'
        visible={modalOpen}
        onOk={() => {
          const addressToAdd = modalAddress
          setModalAddress('')
          setModalOpen(false)

          if (uniqueCreatorsWithUpdates[addressToAdd]) {
            notify({
              message: 'Artist already added!',
              type: 'error',
            })
            return
          }

          let address: StringPublicKey
          try {
            address = addressToAdd
            setUpdatedCreators(u => ({
              ...u,
              [modalAddress]: new WhitelistedCreator({
                address,
                activated: true,
              }),
            }))
          } catch {
            notify({
              message: 'Only valid Solana addresses are supported',
              type: 'error',
            })
          }
        }}
        onCancel={() => {
          setModalAddress('')
          setModalOpen(false)
        }}>
        <Input value={modalAddress} onChange={e => setModalAddress(e.target.value)} />
      </Modal>

      <Button
        appearance='secondary'
        view='outline'
        isRounded={false}
        onClick={() => setModalOpen(true)}>
        Add Creator
      </Button>
    </>
  )
}

function InnerAdminView({
  store,
  whitelistedCreatorsByCreator,
  connection,
  wallet,
  connected,
}: {
  store: ParsedAccount<Store>
  whitelistedCreatorsByCreator: Record<string, ParsedAccount<WhitelistedCreator>>
  connection: Connection
  wallet: WalletSigner
  connected: boolean
}) {
  const [newStore, setNewStore] = useState(store && store.info && new Store(store.info))
  const [updatedCreators, setUpdatedCreators] = useState<Record<string, WhitelistedCreator>>({})
  const [filteredMetadata, setFilteredMetadata] = useState<{
    available: ParsedAccount<MasterEditionV1>[]
    unavailable: ParsedAccount<MasterEditionV1>[]
  }>()
  const [loading, setLoading] = useState<boolean>()
  const { metadata, masterEditions } = useMeta()
  const state = useMeta()

  const { accountByMint } = useUserAccounts()
  useMemo(() => {
    const fn = async () => {
      setFilteredMetadata(await filterMetadata(connection, metadata, masterEditions, accountByMint))
    }
    fn()
  }, [connected])

  const uniqueCreators = Object.values(whitelistedCreatorsByCreator).reduce(
    (acc: Record<string, WhitelistedCreator>, e) => {
      acc[e.info.address] = e.info
      return acc
    },
    {}
  )

  const uniqueCreatorsWithUpdates = { ...uniqueCreators, ...updatedCreators }

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
          address: StringPublicKey
          activated: boolean
          name: string
          key: string
        }
      ) => (
        <Switch
          checkedChildren='Active'
          unCheckedChildren='Inactive'
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
  ]

  return (
    <Content className={'admin-content'}>
      <div className='container flex flex-col gap-[40px] py-[80px]'>
        <div className='flex w-full justify-between'>
          <div className='flex items-center gap-[16px]'>
            <ArtistModal
              setUpdatedCreators={setUpdatedCreators}
              uniqueCreatorsWithUpdates={uniqueCreatorsWithUpdates}
            />

            <Button
              appearance='neutral'
              isRounded={false}
              onClick={async () => {
                notify({
                  message: 'Saving...',
                  type: 'info',
                })
                await saveAdmin(connection, wallet, newStore.public, Object.values(updatedCreators))
                notify({
                  message: 'Saved',
                  type: 'success',
                })
              }}
              type='primary'>
              Submit
            </Button>
          </div>

          <div className='flex'>
            <Switch
              checkedChildren='Public'
              unCheckedChildren='Whitelist Only'
              checked={newStore.public}
              onChange={val => {
                setNewStore(() => {
                  const newS = new Store(store.info)
                  newS.public = val
                  return newS
                })
              }}
            />
          </div>
        </div>

        <div className='flex w-full'>
          <Table
            className='ant-table'
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
        </div>

        {!store.info.public && (
          <div className='flex max-w-[700px] flex-col gap-[20px]'>
            <h4 className='text-h6'>
              You have {filteredMetadata?.available.length} MasterEditionV1s that can be converted
              right now and {filteredMetadata?.unavailable.length} still in unfinished auctions that
              cannot be converted yet.
            </h4>

            <div className='flex'>
              <Button
                disabled={loading}
                appearance='neutral'
                isRounded={false}
                onClick={async () => {
                  setLoading(true)
                  await convertMasterEditions(
                    connection,
                    wallet,
                    filteredMetadata?.available || [],
                    accountByMint
                  )
                  setLoading(false)
                }}>
                {loading ? <Spin /> : <span>Convert Eligible Master Editions</span>}
              </Button>
            </div>
          </div>
        )}

        <div className='flex flex-col gap-[20px]'>
          <div className='flex max-w-[700px] flex-col gap-[20px]'>
            <h4 className='text-h6'>Upgrade the performance of your existing auctions.</h4>

            <div className='flex'>
              <Button
                disabled={loading}
                appearance='neutral'
                isRounded={false}
                onClick={async () => {
                  setLoading(true)
                  await cacheAllAuctions(wallet, connection, state)
                  setLoading(false)
                }}>
                {loading ? <Spin /> : <span>Upgrade Auction Performance</span>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Content>
  )
}
