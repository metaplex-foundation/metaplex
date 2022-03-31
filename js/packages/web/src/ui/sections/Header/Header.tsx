import React, { FC, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  SearchField,
  ConnectButton,
  Button,
  Logo,
  contexts,
  useQuerySearch,
  useMeta,
  useStore,
  Dropdown,
  DropDownBody,
  DropDownToggle,
  DropDownMenuItem,
} from '@oyster/common'
import { useWallet } from '@solana/wallet-adapter-react'
import { CurrentUserBadge } from '../../../components/CurrentUserBadge'
import useSearch from '../../../hooks/useSearch'
import { useLocation } from 'react-router-dom'
import CN from 'classnames'
import { Notifications } from '../../../components/Notifications'

interface HeaderProps {}

const usePathname = () => {
  const location = useLocation()
  return location.pathname
}
const { ENDPOINTS, useConnectionConfig } = contexts.Connection

export const Header: FC<HeaderProps> = () => {
  const { connected } = useWallet()
  const { onChangeSearchText, searchText, onSubmitSearch } = useSearch()
  const pathname = usePathname()
  const { endpoint } = useConnectionConfig()
  const routerSearchParams = useQuerySearch()
  const [ isStoreOwner, setIsStoreOwner ] = useState<boolean>()
  const { storeAddress } = useStore()
  const { publicKey } = useWallet()
  const { store, whitelistedCreatorsByCreator } = useMeta()
  const pubKey = publicKey?.toBase58() || ''
  const storeOwnerAddress = process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS

  useEffect(() => {
    if (
      whitelistedCreatorsByCreator[pubKey] &&
      whitelistedCreatorsByCreator[pubKey].info &&
      whitelistedCreatorsByCreator[pubKey].info.address
    ) {
      console.log("Inside header condition", whitelistedCreatorsByCreator[pubKey].info.address === storeOwnerAddress)
      if (whitelistedCreatorsByCreator[pubKey].info.address === storeOwnerAddress) {
        setIsStoreOwner(true)
      } else {
        setIsStoreOwner(false)
      }
    }
  }, [store, storeAddress, publicKey])

  return (
    <div
      className={CN('header relative flex min-h-[42px] w-full items-center transition-all', {
        'py-[40px]': pathname === '/',
        'py-[20px]': pathname !== '/',
      })}>
      <span className="absolute top-0 left-0 right-0 z-[-1] h-[692px] w-full bg-[url('/img/hero-bg-pattern.png')] bg-top" />

      <div className='container relative flex items-center justify-between gap-[24px]'>
        <div className='header__left relative z-10 flex w-full items-center gap-[24px]'>
          <Link to='/'>
            <Logo className='cursor-pointer' />
          </Link>

          <form name='search' onSubmit={onSubmitSearch} className='w-full max-w-[368px]'>
            <SearchField value={searchText} onChange={onChangeSearchText} className='w-full' />
          </form>
        </div>

        <div className='header__right relative z-10 flex flex-shrink-0 items-center gap-[28px]'>
          <Link to='/discover'>
            <Button appearance='link'>Discover Collections</Button>
          </Link>

          <Button appearance='link'>Launchpad</Button>
          <Button appearance='link'>Resources</Button>
          <Button appearance='link'>Donate</Button>

          {connected && (
            <div className='flex items-center gap-[12px]'>
              <CurrentUserBadge showBalance={false} showAddress={true} iconSize={32} />
              <Notifications />

              <Dropdown>
                {({ isOpen, setIsOpen }: any) => {
                  return (
                    <>
                      <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                        <Button
                          appearance='link'
                          icon={<i className='ri-settings-4-line text-[24px] font-400' />}
                        />
                      </DropDownToggle>

                      {isOpen && (
                        <DropDownBody isOpen align='right' className='w-[260px]'>
                          <div className='flex w-full flex-col gap-[8px]'>
                            <label className='text-h6'>Network</label>

                            <div className='flex w-full flex-col'>
                              <div className='flex w-full'>
                                <Dropdown className='w-full'>
                                  {({ isOpen, setIsOpen }: any) => {
                                    const onSelectOption = (network: string) => {
                                      setIsOpen(false)
                                      const windowHash = window.location.hash
                                      routerSearchParams.set('network', network)
                                      const nextLocationHash = `${
                                        windowHash.split('?')[0]
                                      }?${routerSearchParams.toString()}`
                                      window.location.hash = nextLocationHash
                                      window.location.reload()
                                    }

                                    return (
                                      <>
                                        <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                                          <Button
                                            appearance='ghost'
                                            view='outline'
                                            className='w-full'
                                            isRounded={false}
                                            iconAfter={
                                              <i className='ri-arrow-down-s-line font-400' />
                                            }>
                                            {endpoint.name}
                                          </Button>
                                        </DropDownToggle>

                                        {isOpen && (
                                          <DropDownBody align='center' className='w-[200px]'>
                                            {ENDPOINTS.map(({ name }) => (
                                              <DropDownMenuItem
                                                key={name}
                                                onClick={() => onSelectOption(name)}>
                                                {name}
                                              </DropDownMenuItem>
                                            ))}
                                          </DropDownBody>
                                        )}
                                      </>
                                    )
                                  }}
                                </Dropdown>
                              </div>
                            </div>
                          </div>

                          {isStoreOwner && (
                            <div className='flex w-full flex-col gap-[8px] mt-3'>
                              <Link to={'/admin'}>
                                <Button
                                  appearance='ghost'
                                  view='outline'
                                  className='w-full'
                                  isRounded={false}
                                  onClick={() => setIsOpen(false)}
                                >
                                  Admin
                                </Button>
                              </Link>
                            </div>
                          )}
                        </DropDownBody>
                      )}
                    </>
                  )
                }}
              </Dropdown>
            </div>
          )}

          {!connected && <ConnectButton allowWalletChange />}
        </div>
      </div>
    </div>
  )
}
