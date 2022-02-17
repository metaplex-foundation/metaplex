import React, { FC } from 'react'
import CN from 'classnames'

export interface TableProps {
  [x: string]: any
}

export const Td = ({ children, align = 'center', ...restProps }) => {
  return (
    <td
      className='p-2 text-gray-800 font-400 text-md whitespace-nowrap group-hover:bg-[#edf7ff] first-of-type:!rounded-l-[8px] last-of-type:!rounded-r-[8px] transition-colors'
      {...restProps}
    >
      <div
        className={CN('flex w-full', {
          'justify-start': align === 'left',
          'justify-end': align === 'right',
          'justify-center': align === 'center',
        })}
      >
        {children}
      </div>
    </td>
  )
}

export const Th = ({ children, ...restProps }) => {
  return (
    <th
      className='p-2 text-gray-800 font-500 whitespace-nowrap pb-[8px] sticky top-[-1px] z-20 bg-white h-full'
      {...restProps}
    >
      {children}
    </th>
  )
}

export const Table: FC<TableProps> = ({ className, children, ...restProps }: TableProps) => {
  const TableClasses = CN(`table w-full overflow-x-auto`, className)

  return (
    <div className={TableClasses} {...restProps}>
      <table className='relative w-full text-center border-collapse table-fixed'>{children}</table>
    </div>
  )
}

export default Table
