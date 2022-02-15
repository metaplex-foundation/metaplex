import React, { useCallback } from 'react'
import { ButtonProps } from 'antd/lib/button'
import CN from 'classnames'
import { useWallet } from '@solana/wallet-adapter-react'

import {
  Dropdown,
  DropDownBody,
  DropDownToggle,
  DropDownMenuItem,
  Button,
} from '../../ui-components'

import { useWalletModal } from '../../contexts'
import { useViewport } from '../../utils'

export interface ConnectButtonProps extends ButtonProps, React.RefAttributes<HTMLElement> {
  allowWalletChange?: boolean
  className?: string
}

export const ConnectButton = (props: ConnectButtonProps) => {
  const { children, disabled, allowWalletChange, ...rest }: any = props
  const { wallet, connect, connected } = useWallet()
  const { isMobile, isDesktop } = useViewport()
  const { setVisible } = useWalletModal()
  const open = useCallback(() => setVisible(true), [setVisible])

  const handleClick = useCallback(
    () => (wallet ? connect().catch(() => {}) : open()),
    [wallet, connect, open]
  )

  // only show if wallet selected or user connected

  const renderButton = () => {
    if (!isDesktop) {
      if (connected) {
        return children
      } else {
        return <i className='ri-wallet-fill inline-flex' />
      }
    } else {
      if (connected) {
        return children
      } else {
        return 'Connect wallet'
      }
    }
  }

  if (!wallet || !allowWalletChange) {
    return (
      <Button
        view={!isDesktop ? 'solid' : 'outline'}
        appearance={isDesktop && 'ghost-invert'}
        className={
          !isDesktop &&
          CN(
            'hover:!text-B-400 focus:!text-B-400 ml-[4px] px-[8px] text-white hover:!bg-white focus:!bg-white'
          )
        }
        onClick={(e: any) => {
          props.onClick ? props.onClick(e) : null
          handleClick()
        }}
        disabled={connected && disabled}
        {...rest}
      >
        {renderButton()}
      </Button>
    )
  }

  return (
    <>
      <Button
        size='lg'
        onClick={handleClick}
        disabled={connected && disabled}
        className='hover:!text-B-400 focus:!text-B-400 hover:!bg-white focus:!bg-white'
      >
        {isMobile ? <i className='ri-wallet-fill inline-flex' /> : 'Connect'}
      </Button>

      <Dropdown>
        {({ isOpen, setIsOpen }: any) => {
          return (
            <>
              <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                <Button
                  size='lg'
                  className='hover:!text-B-400 focus:!text-B-400 px-[8px] hover:!bg-white focus:!bg-white'
                >
                  <i className='ri-arrow-down-s-line flex' />
                </Button>
              </DropDownToggle>

              {isOpen && (
                <DropDownBody
                  align='right'
                  className='shadow-B-700/5 border-B-10 w-[200px] border-x border-b shadow-lg'
                >
                  <DropDownMenuItem onClick={open}>Change Wallet</DropDownMenuItem>
                </DropDownBody>
              )}
            </>
          )
        }}
      </Dropdown>
    </>
  )
}
