import React, { FC } from 'react';
import CN from 'classnames';
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
    `header flex gap-[28px] items-center bg-B-50 py-[20px] px-[32px]`,
    className,
  );

  return (
    <div className={HeaderClasses} {...restProps}>
      <div className="flex items-center gap-[28px]">
        <Logo isInverted />
        <HeaderSearch />
      </div>

      <HeaderMenu className="ml-auto" />

      <div className="flex items-center gap-[24px]">
        <button className="flex appearance-none text-[28px] text-white">
          <i className="ri-user-3-fill" />
        </button>

        <button className="flex appearance-none text-[24px] text-white">
          <svg
            width="32"
            height="32"
            viewBox="0 0 40 39"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 6C0 2.68629 2.68629 0 6 0H34C37.3137 0 40 2.68629 40 6V33C40 36.3137 37.3137 39 34 39H6C2.68629 39 0 36.3137 0 33V6Z"
              fill="white"
              fillOpacity="0.31"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M34 2H6C3.79086 2 2 3.79086 2 6V33C2 35.2091 3.79086 37 6 37H34C36.2091 37 38 35.2091 38 33V6C38 3.79086 36.2091 2 34 2ZM6 0C2.68629 0 0 2.68629 0 6V33C0 36.3137 2.68629 39 6 39H34C37.3137 39 40 36.3137 40 33V6C40 2.68629 37.3137 0 34 0H6Z"
              fill="white"
            />
            <path
              d="M35 19.5C35 20.8807 33.8807 22 32.5 22C31.1193 22 30 20.8807 30 19.5C30 18.1193 31.1193 17 32.5 17C33.8807 17 35 18.1193 35 19.5Z"
              fill="#295EBE"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Header;
