import { useConnection, useStore, useWalletModal, Wallet, WhitelistedCreator } from '@oyster/common'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from 'antd'
import React, { useCallback, useEffect, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { saveAdmin } from '../../actions/saveAdmin'
import { useMeta } from '../../contexts'
import { SetupVariables } from '../../components/SetupVariables'
import { createAuctionHouse } from '../../actions/createAuctionHouse'
import { Transaction } from '@solana/web3.js'
import { addAuctionHouse } from '../../api/auctionHouseApi'

export const SetupView = () => {
  const [isInitalizingStore, setIsInitalizingStore] = useState(false)
  const connection = useConnection()
  const { store } = useMeta()
  const { setStoreForOwner } = useStore()
  const history = useHistory()
  const wallet = useWallet()
  const { setVisible } = useWalletModal()
  const connect = useCallback(
    () => (wallet.wallet ? wallet.connect().catch() : setVisible(true)),
    [wallet.wallet, wallet.connect, setVisible]
  )
  const [storeAddress, setStoreAddress] = useState<string | undefined>()

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS) {
      const getStore = async () => {
        if (wallet.publicKey) {
          const store = await setStoreForOwner(wallet.publicKey.toBase58())
          setStoreAddress(store)
        } else {
          setStoreAddress(undefined)
        }
      }
      getStore()
    }
  }, [wallet.publicKey])

  const createNewAuctionHouse = async () => {
    const auctionHouseCreateInstruction = await createAuctionHouse({
      wallet: wallet as any,
      sellerFeeBasisPoints: 500,
      treasuryWithdrawalDestination: process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS,
      feeWithdrawalDestination: process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS,
    })

    const transaction = new Transaction()

    transaction.add(auctionHouseCreateInstruction)

    transaction.feePayer = wallet.publicKey as any
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

    const signedTransaction = await wallet.signTransaction(transaction)

    const txtId = await connection.sendRawTransaction(signedTransaction.serialize())

    if (txtId) await connection.confirmTransaction(txtId)
    debugger
  }

  const initializeStore = async () => {
    if (!wallet.publicKey) {
      return
    }

    setIsInitalizingStore(true)

    await saveAdmin(connection, wallet, false, [
      new WhitelistedCreator({
        address: wallet.publicKey.toBase58(),
        activated: true,
      }),
    ])

    await createNewAuctionHouse()
    // TODO: process errors

    await setStoreForOwner(undefined)
    await setStoreForOwner(wallet.publicKey.toBase58())

    history.push('/admin')
  }

  return (
    <>
      {!wallet.connected && (
        <p>
          <Button type='primary' className='app-btn' onClick={connect}>
            Connect
          </Button>{' '}
          to configure store.
        </p>
      )}
      {wallet.connected && !store && (
        <>
          <p>Store is not initialized yet</p>
          <p>There must be some ◎ SOL in the wallet before initialization.</p>
          <p>After initialization, you will be able to manage the list of creators</p>

          <p>
            <Button
              className='app-btn'
              type='primary'
              loading={isInitalizingStore}
              onClick={initializeStore}>
              Init Store
            </Button>
          </p>
        </>
      )}
      {wallet.connected && store && (
        <>
          <p>
            To finish initialization please copy config below into <b>packages/web/.env</b> and
            restart yarn or redeploy
          </p>
          <SetupVariables
            storeAddress={storeAddress}
            storeOwnerAddress={wallet.publicKey?.toBase58()}
          />
        </>
      )}
    </>
  )
}
