import React, { FC } from 'react'
import CN from 'classnames'

export interface SearchFieldProps {
  [x: string]: any
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export const SearchField: FC<SearchFieldProps> = ({
  className,
  size,
  ...restProps
}: SearchFieldProps) => {
  const SearchFieldClasses = CN(
    `search-field flex items-center bg-[#F4F7FA] gap-[8px] rounded-full border-2 border-[#F4F7FA] focus-within:border-N-700 focus-within:bg-white text-md px-[13px]`,
    className,
    {
      'h-[40px] px-[8px]': size === 'md',
    }
  )

  return (
    <div className={SearchFieldClasses}>
      <i className='ri-search-2-line flex flex-shrink-0 items-center text-[20px]' />
      <input
        type='search'
        className='flex h-full w-full items-center bg-transparent outline-none placeholder:text-sm placeholder:text-[#848E9E]'
        {...restProps}
      />
    </div>
  )
}

SearchField.defaultProps = {
  placeholder: 'Search collections, NFTs, or Tags',
  size: 'md',
}

export default SearchField
