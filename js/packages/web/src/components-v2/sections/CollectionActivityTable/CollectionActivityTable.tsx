import React, { FC } from 'react'
import CN from 'classnames'
import { collectionActivityTable } from '../../../../dummy-data/collection-activity-table'
import { Avatar } from '../../atoms/Avatar'
import { Table, Th, Td } from '../../atoms/Table'

export interface CollectionActivityTableProps {
  [x: string]: any
}

export const CollectionActivityTable: FC<CollectionActivityTableProps> = ({
  className,
  ...restProps
}: CollectionActivityTableProps) => {
  const CollectionActivityTableClasses = CN(`collection-activity-table w-full flex`, className)

  return (
    <div className={CollectionActivityTableClasses} {...restProps}>
      <Table>
        <thead className='text-md font-semibold text-gray-400'>
          <tr className='group'>
            <Th align='left'>Item</Th>
            <Th align='center'>Price</Th>
            <Th>From</Th>
            <Th>To</Th>
            <Th align='right'>Time</Th>
          </tr>
        </thead>
        <tbody>
          {collectionActivityTable.map(
            ({ image, name, price, from, to, time }: any, index: number) => {
              return (
                <tr key={index} className='group odd:bg-[#F4FAFF]'>
                  <Td align='left'>
                    <div className='inline-flex items-center gap-[12px]'>
                      <Avatar size='md' image={image} radius='!rounded-[8px]' />
                      <a className='text-B-400'>{name}</a>
                    </div>
                  </Td>
                  <Td align='center'>
                    <div className='inline-flex items-center'>
                      <span className='font-500 text-gray-800'>{price}</span>
                    </div>
                  </Td>
                  <Td>
                    <a href='#' className='cursor-pointer truncate text-B-400'>
                      {from}
                    </a>
                  </Td>
                  <Td>
                    <a href='#' className='cursor-pointer truncate text-B-400'>
                      {to}
                    </a>
                  </Td>
                  <Td align='right'>
                    <a className='flex w-full cursor-pointer items-center justify-end gap-[4px] font-500 text-B-400'>
                      {time} <i className='ri-arrow-right-up-line' />
                    </a>
                  </Td>
                </tr>
              )
            }
          )}
        </tbody>
      </Table>
    </div>
  )
}

export default CollectionActivityTable
