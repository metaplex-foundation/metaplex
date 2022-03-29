import React, { FC, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Popover, Select } from 'antd'
import {
  SearchField,
  ConnectButton,
  Button,
  Logo,
  contexts,
  useQuerySearch,
  useMeta,
} from '@oyster/common'
import { useWallet } from '@solana/wallet-adapter-react'
import { CurrentUserBadge } from '../../../components/CurrentUserBadge'
import useSearch from '../../../hooks/useSearch'
import { useLocation } from 'react-router-dom'
import CN from 'classnames'
import { SettingOutlined } from '@ant-design/icons'
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
  const { publicKey } = useWallet()
  const { whitelistedCreatorsByCreator } = useMeta()
  const pubKey = publicKey?.toBase58() || ''
  const storeOwnerAddress = process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS

  const isStoreOwner = useMemo(() => {
    if (whitelistedCreatorsByCreator[pubKey] !== undefined) {
      return whitelistedCreatorsByCreator[pubKey].info.address === storeOwnerAddress
    } else {
      return false
    }
  }, [whitelistedCreatorsByCreator, pubKey])

  return (
    <div
      className={CN('header relative flex min-h-[42px] w-full items-center transition-all', {
        'py-[40px]': pathname === '/',
        'py-[20px]': pathname !== '/',
      })}>
      <span className="absolute top-0 left-0 right-0 z-[-1] h-[692px] w-full bg-[url('/img/hero-bg-pattern.png')] bg-top" />

      <div className='container relative flex items-center justify-between'>
        <div className='header__left relative z-10 flex w-full items-center gap-[24px]'>
          <Link to='/'>
            <Logo className='cursor-pointer' />
          </Link>

          <form name='search' onSubmit={onSubmitSearch}>
            <SearchField
              value={searchText}
              onChange={onChangeSearchText}
              className='min-w-[368px]'
            />
          </form>
        </div>

        <div className='header__right relative z-10 flex flex-shrink-0 items-center gap-[28px]'>
          <Link to='/discover'>
            <Button appearance='link'>Discover Collections</Button>
          </Link>

          <Button appearance='link'>Launchpad</Button>
          <Button appearance='link'>Resources</Button>
          <Button appearance='link'>Donate</Button>

          {!connected && <ConnectButton allowWalletChange />}

          {connected && (
            <div className='flex items-center gap-[6px]'>
              <CurrentUserBadge showBalance={false} showAddress={true} iconSize={32} />
              <Notifications />
              <div className='wallet-wrapper'>
                <Popover
                  trigger='click'
                  content={
                    <>
                      <div style={{ width: 250 }}>
                        <h5
                          style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            letterSpacing: '0.02em',
                          }}>
                          NETWORK
                        </h5>
                        <Select
                          onSelect={network => {
                            const windowHash = window.location.hash
                            routerSearchParams.set('network', network)
                            const nextLocationHash = `${
                              windowHash.split('?')[0]
                            }?${routerSearchParams.toString()}`
                            window.location.hash = nextLocationHash
                            window.location.reload()
                          }}
                          value={endpoint.name}
                          bordered={false}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: 8,
                            width: '100%',
                            marginBottom: 10,
                          }}>
                          {ENDPOINTS.map(({ name }) => (
                            <Select.Option value={name} key={endpoint.name}>
                              {name}
                            </Select.Option>
                          ))}
                        </Select>
                      </div>
                      {isStoreOwner ? (
                        <div style={{ display: 'grid', marginTop: '10px' }}>
                          <Link to={'/admin'} style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            <h5
                              style={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                letterSpacing: '0.02em',
                              }}>
                              Admin
                            </h5>
                          </Link>
                        </div>
                      ) : null}
                    </>
                  }>
                  <SettingOutlined style={{ fontSize: 18 }} />
                </Popover>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
