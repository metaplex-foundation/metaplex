import React, { FC } from 'react';
import CN from 'classnames';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { header } from '../../../../dummy-data/header';

import {
  Dropdown,
  DropDownBody,
  DropDownToggle,
  DropDownMenuItem,
} from '../../atoms/Dropdown';

export interface HeaderMenuProps {
  [x: string]: any;
}

export const HeaderMenu: FC<HeaderMenuProps> = ({
  className,
  ...restProps
}: HeaderMenuProps) => {
  const router = useRouter();
  const HeaderMenuClasses = CN(
    `header-menu flex gap-[12px] items-center`,
    className,
  );

  return (
    <div className={HeaderMenuClasses} {...restProps}>
      {header?.menu.map((menuItem: any, index: number) => {
        if (!menuItem.subMenu) {
          return (
            <Link href={menuItem?.value} key={index}>
              <button
                key={index}
                className={CN(
                  'h-[40px] inline-flex items-center justify-center px-[12px] text-white hover:bg-white hover:text-B-400 rounded-[4px]',
                )}
              >
                {menuItem?.label}
              </button>
            </Link>
          );
        }

        return (
          <Dropdown key={index}>
            {({ isOpen, setIsOpen }: any) => {
              const onSelectOption = (value: string) => {
                setIsOpen(false);
                router.push({
                  pathname: menuItem?.value,
                  query: { pid: value },
                }); // Redirecting to the URL
              };

              return (
                <>
                  <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                    <button
                      className={CN(
                        'h-[40px] inline-flex items-center justify-center px-[12px] text-white hover:bg-white hover:text-B-400',
                        {
                          'rounded-t-[4px] bg-white text-B-400': isOpen,
                          'rounded-[4px]': !isOpen,
                        },
                      )}
                    >
                      {menuItem?.label}
                    </button>
                  </DropDownToggle>

                  {isOpen && (
                    <DropDownBody
                      align="left"
                      className="w-[172px] !rounded-tl-none"
                    >
                      {menuItem?.subMenu?.map((option: any, index: number) => {
                        const { label, value } = option;

                        return (
                          <DropDownMenuItem
                            key={index}
                            onClick={() => onSelectOption(value)}
                            {...option}
                          >
                            {label}
                          </DropDownMenuItem>
                        );
                      })}
                    </DropDownBody>
                  )}
                </>
              );
            }}
          </Dropdown>
        );
      })}
    </div>
  );
};

export default HeaderMenu;
