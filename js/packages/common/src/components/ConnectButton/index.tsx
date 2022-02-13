import { ButtonProps } from 'antd/lib/button';
import React, { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '../../contexts';
import {
  Dropdown,
  DropDownBody,
  DropDownToggle,
  DropDownMenuItem,
  Button,
} from '../../ui-components';

export interface ConnectButtonProps
  extends ButtonProps,
    React.RefAttributes<HTMLElement> {
  allowWalletChange?: boolean;
  className?: string;
}

export const ConnectButton = (props: ConnectButtonProps) => {
  const { children, disabled, allowWalletChange, ...rest }: any = props;
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
      <Button
        // className="hover:!bg-white hover:!text-B-400"
        view="outline"
        appearance="ghost-invert"
        onClick={(e: any) => {
          props.onClick ? props.onClick(e) : null;
          handleClick();
        }}
        disabled={connected && disabled}
        {...rest}
      >
        {connected ? children : 'Connect Wallet'}
      </Button>
    );
  }

  return (
    <>
      <Button
        size="lg"
        onClick={handleClick}
        disabled={connected && disabled}
        className="hover:!bg-white hover:!text-B-400 focus:!bg-white focus:!text-B-400"
      >
        Connect
      </Button>

      <Dropdown>
        {({ isOpen, setIsOpen }: any) => {
          return (
            <>
              <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                <Button
                  size="lg"
                  className="px-[8px] hover:!bg-white hover:!text-B-400 focus:!bg-white focus:!text-B-400"
                >
                  <i className="flex ri-arrow-down-s-line" />
                </Button>
              </DropDownToggle>

              {isOpen && (
                <DropDownBody
                  align="right"
                  className="w-[200px] shadow-lg shadow-B-700/5 border-x border-b border-B-10"
                >
                  <DropDownMenuItem onClick={open}>
                    Change Wallet
                  </DropDownMenuItem>
                </DropDownBody>
              )}
            </>
          );
        }}
      </Dropdown>
    </>
  );
};
