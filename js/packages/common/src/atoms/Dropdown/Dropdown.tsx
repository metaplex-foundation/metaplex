import React, { FC, useState, useRef } from 'react'
import CN from 'classnames'
import { useOutsideClick } from '../../utils/useOutsideClick'

export interface DropdownProps {
  [x: string]: any
  children?: any
  open?: boolean
}

export const DropDownBody = ({ children, className, width, align }: any) => {
  return (
    <div
      className={CN(
        'absolute z-[2000] mt-[4px] rounded-[12px] border border-slate-100 bg-white px-[16px] py-[16px] shadow',
        {
          'right-0': align === 'right',
          'left-0': align === 'left',
          'left-1/2 -translate-x-1/2 transform': align === 'center',
        },
        className
      )}
      style={{ width: typeof width === 'number' ? `${width}px` : width }}>
      {children}
    </div>
  )
}

export const DropDownToggle = ({ children, className, onClick }: any) => {
  return (
    <div className={CN('relative flex', className)} onClick={onClick}>
      {children}
    </div>
  )
}

export const DropDownMenuItem = ({ children, onClick, iconBefore }: any) => {
  return (
    <div
      className={CN(
        'text-md flex cursor-pointer items-center rounded-[4px] bg-white py-[10px] px-[10px] duration-100 ease-in-out hover:rounded-[12px] hover:bg-slate-50'
      )}
      onClick={onClick}>
      {iconBefore && <div className={CN('icon mr-[8px] flex-shrink-0')}>{iconBefore}</div>}
      <span>{children}</span>
    </div>
  )
}

export const Dropdown: FC<DropdownProps> = ({
  children,
  className,
  elementID,
  open,
  ...restProps
}: DropdownProps) => {
  const wrapperRef = useRef(null)
  const DropdownClasses = CN(`dropdown relative`, className, {})
  const [isOpen, setIsOpen] = useState(open)
  const [innerValue, setInnerValue] = useState('')
  const [iconBefore, setIconBefore] = useState()

  useOutsideClick(wrapperRef, () => setIsOpen(false))

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
  )
}

Dropdown.defaultProps = {}

export default Dropdown
