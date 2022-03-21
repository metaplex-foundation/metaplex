import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { SearchField, ConnectButton, Button, Logo } from '@oyster/common'
import { useWallet } from '@solana/wallet-adapter-react'
import { CurrentUserBadge } from '../../../components/CurrentUserBadge'
import useSearch from '../../../hooks/useSearch'
import { useLocation } from 'react-router-dom'
import CN from 'classnames'

interface HeaderProps {}

const usePathname = () => {
  const location = useLocation()
  return location.pathname
}

export const Header: FC<HeaderProps> = () => {
  const { connected } = useWallet()
  const { onChangeSearchText, searchText, onSubmitSearch } = useSearch()
  const pathname = usePathname()

  console.log(pathname)

  return (
    <div
      className={CN('header relative flex min-h-[42px] w-full items-center', {
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
          <Button appearance='link'>Discover Collections</Button>
          <Button appearance='link'>Launchpad</Button>
          <Button appearance='link'>Resources</Button>
          <Button appearance='link'>Donate</Button>

          {!connected && <ConnectButton allowWalletChange />}

          {connected && (
            <div className='flex items-center gap-[4px]'>
              <CurrentUserBadge showBalance={false} showAddress={true} iconSize={32} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
