import React, { FC } from 'react';
import CN from 'classnames';
import Link from 'next/link';

import { Logo } from '../../atoms/Logo';
import { HeaderMenu } from '../../molecules/HeaderMenu';
import { HeaderSearch } from '../../molecules/HeaderSearch';

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

  return (
    <div className={HeaderClasses} {...restProps}>
      <div className="flex items-center gap-[28px]">
        <Link href="/" passHref>
          <Logo isInverted className="cursor-pointer" />
        </Link>
        <HeaderSearch />
      </div>

      <HeaderMenu className="ml-auto" />

      <div className="flex items-center gap-[24px]">
        <button className="flex appearance-none text-[24px] text-white">
          <i className="ri-user-3-fill" />
        </button>

        <button className="flex text-base text-white border-2 border-white hover:border-B-500 appearance-none rounded-[6px] px-[12px] h-[40px] items-center justify-center font-500 hover:bg-B-500 transition-all active:scale-[0.97]">
          Create Wallet
        </button>
      </div>
    </div>
  );
};

export default Header;
