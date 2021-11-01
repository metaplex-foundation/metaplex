import { useWallet } from '@solana/wallet-adapter-react';
import { Button, ButtonProps, Popover, PopoverProps, Space } from 'antd';
import React, { useCallback } from 'react';
import { useWalletModal } from '../../contexts';

export interface ConnectButtonProps
  extends ButtonProps,
    React.RefAttributes<HTMLElement> {
  popoverPlacement?: PopoverProps['placement'];
  allowWalletChange?: boolean;
}

export const ConnectButton = ({
  onClick,
  children,
  disabled,
  allowWalletChange,
  popoverPlacement,
  ...rest
}: ConnectButtonProps) => {
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
        {...rest}
        onClick={e => {
          onClick && onClick(e);
          handleClick();
        }}
        disabled={connected && disabled}
      >
        {connected ? children : 'Connect Wallet'}
      </Button>
    );
  }

  return (
    <Popover
      trigger="click"
      placement={popoverPlacement}
      content={
        <Space direction="vertical">
          <Button onClick={open}>Change wallet</Button>
        </Space>
      }
    >
      <Button {...rest} onClick={handleClick} disabled={connected && disabled}>
        Connect
      </Button>
    </Popover>
  );
};
