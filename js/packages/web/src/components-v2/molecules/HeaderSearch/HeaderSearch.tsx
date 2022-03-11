import React, { FC } from 'react'
import CN from 'classnames'
import { TextField } from '../../atoms/TextField'
import useSearch from '../../../hooks/useSearch'

export interface HeaderSearchProps {
  [x: string]: any
}

export const HeaderSearch: FC<HeaderSearchProps> = ({
  className,
  ...restProps
}: HeaderSearchProps) => {
  const HeaderSearchClasses = CN(`header-search lg:w-[380px]`, className)
  const { onChangeSearchText, searchText, onSubmitSearch } = useSearch()

  return (
    <div className={HeaderSearchClasses} {...restProps}>
      <form name='search' onSubmit={onSubmitSearch}>
        <TextField
          value={searchText}
          onChange={onChangeSearchText}
          iconBefore={<i className='ri-search-2-line text-white' />}
          placeholder='Search Collections'
          size='sm'
          wrapperClassName='border-2 !border-transparent !bg-white/20 !w-full focus-within:!bg-B-400 focus-within:!border-2 focus-within:!border-white'
          className='text-white placeholder:font-400 placeholder:!text-white focus:placeholder:!text-white/70'
        />
      </form>
    </div>
  )
}

export default HeaderSearch
