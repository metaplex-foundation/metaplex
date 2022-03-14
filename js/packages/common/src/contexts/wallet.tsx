import { WalletAdapter, WalletError } from '@solana/wallet-adapter-base'
import { useWallet, WalletProvider as BaseWalletProvider } from '@solana/wallet-adapter-react'
import {
  getLedgerWallet,
  getMathWallet,
  getPhantomWallet,
  getSlopeWallet,
  getSolflareWallet,
  getSolletWallet,
  getSolongWallet,
} from '@solana/wallet-adapter-wallets'
import { Collapse } from 'antd'
import React, {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { notify } from '../utils'
import { MetaplexModal } from '../components'
import { Button } from './../atoms'

const { Panel } = Collapse

export interface WalletModalContextState {
  visible: boolean
  setVisible: (open: boolean) => void
}

export const WalletModalContext = createContext<WalletModalContextState>(
  {} as WalletModalContextState
)

export function useWalletModal(): WalletModalContextState {
  return useContext(WalletModalContext)
}

export const WalletModal: FC = () => {
  const { wallets, select } = useWallet()
  const { visible, setVisible } = useWalletModal()
  const close = useCallback(() => {
    setVisible(false)
  }, [setVisible])

  const phatomWallet = useMemo(() => getPhantomWallet(), [])

  return (
    <MetaplexModal title='Connect Wallet' visible={visible} onCancel={close}>
      <span className='mb-[12px] text-gray-400'>RECOMMENDED</span>

      <Button
        onClick={() => {
          console.log(phatomWallet.name)
          select(phatomWallet.name)
          close()
        }}
        iconBefore={<img src={phatomWallet?.icon} style={{ width: '1.2rem' }} />}
        size='lg'
        appearance='ghost'
        className='mb-[12px] w-full'
      >
        Connect to Phantom
      </Button>

      <Collapse
        ghost
        expandIcon={panelProps =>
          panelProps.isActive ? (
            <svg
              width='20'
              height='20'
              viewBox='0 0 20 20'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M15 7.5L10 12.5L5 7.5'
                stroke='white'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          ) : (
            <svg
              width='20'
              height='20'
              viewBox='0 0 20 20'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M7.5 5L12.5 10L7.5 15'
                stroke='white'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          )
        }
      >
        <Panel
          className='mx-[-16px]'
          header={<span className='font-500 text-white'>Other Wallets</span>}
          key='1'
        >
          <div className='flex w-full flex-col gap-[8px]'>
            {wallets.map((wallet, idx) => {
              if (wallet.name === 'Phantom') return null
              return (
                <Button
                  key={idx}
                  onClick={() => {
                    select(wallet.name)
                    close()
                  }}
                  view='outline'
                  appearance='ghost-invert'
                >
                  Connect to {wallet.name}
                </Button>
              )
            })}
          </div>
        </Panel>
      </Collapse>
    </MetaplexModal>
  )
}

export const WalletModalProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { publicKey } = useWallet()
  const [connected, setConnected] = useState(!!publicKey)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (publicKey) {
      const base58 = publicKey.toBase58()
      const keyToDisplay =
        base58.length > 20
          ? `${base58.substring(0, 7)}.....${base58.substring(base58.length - 7, base58.length)}`
          : base58

      notify({
        message: 'Wallet update',
        description: 'Connected to wallet ' + keyToDisplay,
      })
    }
  }, [publicKey])

  useEffect(() => {
    if (!publicKey && connected) {
      notify({
        message: 'Wallet update',
        description: 'Disconnected from wallet',
      })
    }
    setConnected(!!publicKey)
  }, [publicKey, connected, setConnected])

  return (
    <WalletModalContext.Provider
      value={{
        visible,
        setVisible,
      }}
    >
      {children}
      <WalletModal />
    </WalletModalContext.Provider>
  )
}

export const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const wallets = useMemo(
    () => [
      getPhantomWallet(),
      getSolflareWallet(),
      getSlopeWallet(),
      // getTorusWallet({
      //   options: {
      //     // @FIXME: this should be changed for Metaplex, and by each Metaplex storefront
      //     clientId:
      //       'BOM5Cl7PXgE9Ylq1Z1tqzhpydY0RVr8k90QQ85N7AKI5QGSrr9iDC-3rvmy0K_hF0JfpLMiXoDhta68JwcxS1LQ',
      //   },
      // }),
      getLedgerWallet(),
      getSolongWallet(),
      getMathWallet(),
      getSolletWallet(),
    ],
    []
  )

  const onError = useCallback((error: WalletError) => {
    console.error(error)
    notify({
      message: 'Wallet error',
      description: error.message,
    })
  }, [])

  return (
    <BaseWalletProvider wallets={wallets} onError={onError} autoConnect>
      <WalletModalProvider>{children}</WalletModalProvider>
    </BaseWalletProvider>
  )
}

export type WalletSigner = Pick<
  WalletAdapter,
  'publicKey' | 'signTransaction' | 'signAllTransactions'
>
