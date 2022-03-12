import React, { FC } from 'react'
import CN from 'classnames'
import { Link } from 'react-router-dom'
import { SearchField, ConnectButton, Button, Logo } from '@oyster/common'
import { useWallet } from '@solana/wallet-adapter-react'

import { Cog, CurrentUserBadge } from '../../../components/CurrentUserBadge'

export interface HeaderProps {
  [x: string]: any
}

export const Header: FC<HeaderProps> = ({ className, ...restProps }: HeaderProps) => {
  const HeaderClasses = CN(
    `header relative flex w-full min-h-[42px] flex items-center py-[40px]`,
    className
  )
  const { connected } = useWallet()

  return (
    <div className={HeaderClasses} {...restProps}>
      <span className="absolute top-0 left-0 right-0 z-[-1] h-[692px] w-full bg-[url('/img/hero-bg-pattern.png')] bg-top" />

      <div className='container relative flex items-center justify-between'>
        <div className='header__left relative z-10 flex w-full items-center gap-[24px]'>
          <Link to='/'>
            <Logo className='cursor-pointer' />
          </Link>

          <SearchField className='min-w-[368px] flex-shrink-0' />
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

export default Header
