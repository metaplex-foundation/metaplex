import React, { FC } from 'react'
import CN from 'classnames'
import { Link } from 'react-router-dom'
import { ConnectButton, Button } from '@oyster/common'
import { useWallet } from '@solana/wallet-adapter-react'

import { Logo } from '../../atoms/Logo'
import { HeaderMenu } from '../../molecules/HeaderMenu'
import { HeaderSearch } from '../../molecules/HeaderSearch'
import { Cog, CurrentUserBadge } from '../../../components/CurrentUserBadge'
import { Notifications } from '../../../components/Notifications'

import { useViewport } from '../../../utils/useViewport'

export interface HeaderProps {
  [x: string]: any
}

export const Header: FC<HeaderProps> = ({ className, ...restProps }: HeaderProps) => {
  const { connected } = useWallet()
  const { isDesktop } = useViewport()
  const HeaderClasses = CN(
    `header flex gap-[16px] items-center bg-B-400 py-[8px] lg:py-[20px] px-[16px] lg:px-[32px] fixed top-0 left-0 right-0 z-50 shadow-lg shadow-blue-700/10 z-[1900]`,
    className
  )

  return (
    <div className={HeaderClasses} {...restProps}>
      <div className='flex items-center gap-[12px] lg:gap-[28px]'>
        <Link to='/'>
          <Logo isInverted className='cursor-pointer' width={isDesktop ? 180 : 140} />
        </Link>

        {isDesktop && <HeaderSearch />}
      </div>

      {isDesktop && <HeaderMenu className='ml-auto' />}

      <div className='ml-auto flex items-center lg:ml-[unset]'>
        {!isDesktop && (
          <Button className='px-[8px] focus:!bg-white focus:!text-B-400 hover:!bg-white hover:!text-B-400 lg:mr-[12px]'>
            <i className='ri-search-2-line text-lg' />
          </Button>
        )}

        {!connected && isDesktop && (
          <Button
            className={CN(
              'mr-[4px] px-[8px] focus:!bg-white focus:!text-B-400 hover:!bg-white hover:!text-B-400 lg:mr-[12px]'
            )}
            size='md'>
            <i className='ri-user-3-fill flex text-[20px]' />
          </Button>
        )}

        {!connected && <ConnectButton allowWalletChange />}

        {connected && (
          <div className='flex items-center gap-[4px]'>
            <CurrentUserBadge showBalance={false} showAddress={true} iconSize={24} />

            {isDesktop && <Notifications />}
            {isDesktop && <Cog />}
          </div>
        )}

        {!isDesktop && (
          <Button
            className={CN(
              'ml-[4px] px-[8px] focus:!bg-white focus:!text-B-400 hover:!bg-white hover:!text-B-400'
            )}
            size='md'>
            <i className='ri-menu-line text-lg' />
          </Button>
        )}
      </div>
    </div>
  )
}

export default Header
