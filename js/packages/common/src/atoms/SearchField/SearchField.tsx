import React, { FC } from 'react'
import CN from 'classnames'

export interface SearchFieldProps {
  [x: string]: any
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isRounded?: boolean
  placeholder?: string
  actions?: any
}

export const SearchField: FC<SearchFieldProps> = ({
  className,
  size,
  isRounded,
  placeholder,
  actions,
  ...restProps
}: SearchFieldProps) => {
  const SearchFieldClasses = CN(
    `search-field flex items-center bg-white gap-[8px] border border-slate-300 focus-within:!border-slate-700 focus-within:!shadow-[0px_0px_0px_1px_#040D1F] focus-within:bg-white text-md px-[13px]`,
    className,
    {
      'h-[40px] px-[8px]': size === 'md',
      'h-[52px] px-[8px]': size === 'lg',
      'rounded-full': isRounded,
      'rounded-[4px]': !isRounded,
    }
  )

  return (
    <div className={SearchFieldClasses}>
      <i className='ri-search-2-line flex flex-shrink-0 items-center text-[20px]' />
      <input
        type='search'
        className='flex h-full w-full items-center bg-transparent outline-none placeholder:text-sm placeholder:text-[#848E9E]'
        placeholder={placeholder}
        {...restProps}
      />
      {actions && <div className='flex-shrink-0'>{actions}</div>}
    </div>
  )
}

SearchField.defaultProps = {
  placeholder: 'Search collections, NFTs, or Tags',
  size: 'md',
  view: 'solid',
  isRounded: true,
}

export default SearchField
