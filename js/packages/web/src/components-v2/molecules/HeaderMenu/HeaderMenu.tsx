import React, { FC } from 'react';
import CN from 'classnames';
import { Link, useHistory } from 'react-router-dom';
import { Button } from '@oyster/common';

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
  const { push } = useHistory();
  const HeaderMenuClasses = CN(
    `header-menu flex gap-[12px] items-center`,
    className,
  );

  return (
    <div className={HeaderMenuClasses} {...restProps}>
      {header?.menu.map((menuItem: any, index: number) => {
        if (!menuItem.subMenu) {
          return (
            <Link to={menuItem?.value} key={index}>
              <Button
                key={index}
                className={CN(
                  'hover:!bg-white hover:!text-B-400 focus:!bg-white focus:!text-B-400',
                )}
              >
                {menuItem?.label}
              </Button>
            </Link>
          );
        }

        return (
          <Dropdown key={index}>
            {({ isOpen, setIsOpen }: any) => {
              const onSelectOption = (value: string) => {
                setIsOpen(false);
                push(`${menuItem?.value}?pid=${value}`);
              };

              return (
                <>
                  <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                    <Button
                      className={CN(
                        'hover:!bg-white hover:!text-B-400 focus:!bg-white focus:!text-B-400',
                        {
                          '!rounded-b-[0] !bg-white !text-B-400': isOpen,
                        },
                      )}
                    >
                      {menuItem?.label}
                    </Button>
                  </DropDownToggle>

                  {isOpen && (
                    <DropDownBody
                      align="left"
                      className="w-[172px] !rounded-tl-none shadow-lg shadow-B-700/5 border-x border-b border-B-10"
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
