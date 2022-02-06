import React, { FC, useState, useRef } from 'react';
import CN from 'classnames';
import { useOutsideClick } from '../../../utils/useOutsideClick';

export interface DropdownProps {
  [x: string]: any;
  children?: any;
  open?: boolean;
}

export interface DropdownBodyProps {
  [x: string]: any;
  children?: any;
  className?: string;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
}

export interface DropDownToggleProps {
  [x: string]: any;
  children?: any;
  className?: string;
  onClick?: any;
}

export interface DropDownMenuItemProps {
  [x: string]: any;
  children?: any;
  className?: string;
  onClick?: any;
  iconBefore?: any;
}

export const DropDownBody = ({
  children,
  className,
  width,
  align,
}: DropdownBodyProps) => {
  return (
    <div
      className={CN(
        'absolute bg-white pt-[12px] pb-[8px] px-[8px] rounded-[8px] z-[1100]',
        {
          'right-0': align === 'right',
          'left-0': align === 'left',
          'left-1/2 transform -translate-x-1/2': align === 'center',
        },
        className,
      )}
      style={{ width: typeof width === 'number' ? `${width}px` : width }}
    >
      {children}
    </div>
  );
};

export const DropDownToggle = ({
  children,
  className,
  onClick,
}: DropDownToggleProps) => {
  return (
    <div className={CN('flex relative', className)} onClick={onClick}>
      {children}
    </div>
  );
};

export const DropDownMenuItem = ({
  children,
  className,
  onClick,
  iconBefore,
}: DropDownMenuItemProps) => {
  return (
    <div
      className={CN(
        'bg-white py-[4px] px-[8px] rounded-[4px] mb-[4px] text-md ease-in-out duration-100 flex items-center hover:text-B-400 hover:bg-gray-100 cursor-pointer transition-all',
        className,
      )}
      onClick={onClick}
    >
      {iconBefore && (
        <div className={CN('icon mr-[8px] flex-shrink-0')}>{iconBefore}</div>
      )}
      <span>{children}</span>
    </div>
  );
};

export const Dropdown: FC<DropdownProps> = ({
  children,
  className,
  elementID,
  open,
  ...restProps
}: DropdownProps) => {
  const wrapperRef = useRef(null);
  const DropdownClasses = CN(`dropdown relative`, className, {});
  const [isOpen, setIsOpen] = useState(open);
  const [innerValue, setInnerValue] = useState('');
  const [iconBefore, setIconBefore] = useState();

  useOutsideClick(wrapperRef, () => setIsOpen(false));

  return (
    <div className={DropdownClasses} {...restProps} ref={wrapperRef}>
      {children({
        elementID,
        isOpen,
        setIsOpen,
        innerValue,
        setInnerValue,
        iconBefore,
        setIconBefore,
        ...restProps,
      })}
    </div>
  );
};

Dropdown.defaultProps = {};

export default Dropdown;
