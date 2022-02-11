import { Dropdown, Menu } from 'antd';
import { ButtonProps } from 'antd/lib/button';
import React, { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '../../contexts';

export interface ConnectButtonProps
  extends ButtonProps,
    React.RefAttributes<HTMLElement> {
  allowWalletChange?: boolean;
  className?: string;
}

export const ConnectButton = (props: ConnectButtonProps) => {
  const { children, disabled, allowWalletChange, className, ...rest }: any =
    props;
  const { wallet, connect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const open = useCallback(() => setVisible(true), [setVisible]);

  const handleClick = useCallback(
    () => (wallet ? connect().catch(() => {}) : open()),
    [wallet, connect, open],
  );

  // only show if wallet selected or user connected

  if (!wallet || !allowWalletChange) {
    return (
      <button
        className="flex text-base text-white border-2 border-white hover:border-B-500 appearance-none rounded-[6px] px-[12px] h-[40px] items-center justify-center font-500 hover:bg-B-500 transition-all active:scale-[0.97]"
        onClick={e => {
          props.onClick ? props.onClick(e) : null;
          handleClick();
        }}
        disabled={connected && disabled}
        {...rest}
      >
        {connected ? children : 'Connect Wallet'}
      </button>
    );
  }

  return (
    <Dropdown.Button
      className={className || (connected ? 'connector' : '')}
      onClick={handleClick}
      disabled={connected && disabled}
      overlay={
        <Menu className={'black-dropdown'}>
          <Menu.Item onClick={open}>Change Wallet</Menu.Item>
        </Menu>
      }
    >
      Connect
    </Dropdown.Button>
  );
};
