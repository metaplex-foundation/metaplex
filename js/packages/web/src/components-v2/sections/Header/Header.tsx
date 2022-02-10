import React, { FC } from 'react';
import CN from 'classnames';
import { Link } from 'react-router-dom';
import AvatarPreview from 'boring-avatars';
import { useWallet } from '@solana/wallet-adapter-react';

import { trimWalletAddress } from '../../../utils/trimWalletAddress';

import { ConnectButton } from '@oyster/common';
import { Logo } from '../../atoms/Logo';
import { HeaderMenu } from '../../molecules/HeaderMenu';
import { HeaderSearch } from '../../molecules/HeaderSearch';
import { WalletPreviewCard } from '../../molecules/WalletPreviewCard';
import { Dropdown, DropDownBody, DropDownToggle } from '../../atoms/Dropdown';
import { Cog, CurrentUserBadge } from '../../../components/CurrentUserBadge';
import { Notifications } from '../../../components/Notifications';

export interface HeaderProps {
  [x: string]: any;
}

export const Header: FC<HeaderProps> = ({
  className,
  ...restProps
}: HeaderProps) => {
  const HeaderClasses = CN(
    `header flex gap-[28px] items-center bg-B-400 py-[20px] px-[32px] fixed top-0 left-0 right-0 z-50 shadow-lg shadow-blue-700/10`,
    className,
  );

  const { connected } = useWallet();

  return (
    <div className={HeaderClasses} {...restProps}>
      <div className="flex items-center gap-[28px]">
        <Link to="/">
          <Logo isInverted className="cursor-pointer" />
        </Link>
        <HeaderSearch />
      </div>

      <HeaderMenu className="ml-auto" />

      <div className="flex items-center gap-[24px]">
        <div className="flex">
          <Dropdown>
            {({ isOpen, setIsOpen }: any) => {
              return (
                <>
                  <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                    <button className={CN('flex items-center text-white appearance-none gap-[4px] outline-none h-[40px] px-[12px] rounded-[6px] hover:bg-B-500', {
                      'bg-B-500': isOpen,
                    })}>
                      <AvatarPreview
                        size={28}
                        name="Mary Edwards"
                        variant="ring"
                        colors={[
                          '#005cc1',
                          '#69a5ff',
                          '#ffffff',
                          '#004796',
                          '#00336b',
                          '#00336b',
                        ]}
                      />

                      <span className="text-md font-500">
                        {trimWalletAddress(
                          '13Z7Gi2BwQEZcaYp6vfgywtdSKyqrTxGBL',
                        )}
                      </span>
                    </button>
                  </DropDownToggle>

                  {isOpen && (
                    <DropDownBody
                      align="right"
                      className="w-[300px] shadow-lg shadow-B-700/5 mt-[40px] border border-B-10"
                    >
                      <WalletPreviewCard address="13Z7Gi2BwQEZcaYp6vfgywtdSKyqrTxGBL" />
                    </DropDownBody>
                  )}
                </>
              );
            }}
          </Dropdown>
        </div>

        <button className="flex appearance-none text-[24px] text-white">
          <i className="ri-user-3-fill" />
        </button>

        {!connected && <ConnectButton allowWalletChange />}

        {connected && (
          <>
            <CurrentUserBadge
              showBalance={false}
              showAddress={true}
              iconSize={24}
            />
            <Notifications />
            <Cog />
          </>
        )}
      </div>
    </div>
  );
};

export default Header;
