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
        <thead className='font-semibold text-gray-400 text-md'>
          <tr className='group'>
            <Th align='left'>Item</Th>
            <Th>Price</Th>
            <Th>From</Th>
            <Th>To</Th>
            <Th align='right'>Time</Th>
          </tr>
        </thead>
        <tbody>
          {collectionActivityTable.map(
            ({ image, name, price, from, to, time }: any, index: number) => {
              return (
                <tr key={index} className='odd:bg-[#F4FAFF] group'>
                  <Td align='left'>
                    <div className='inline-flex items-center gap-[12px]'>
                      <Avatar size='md' image={image} radius='!rounded-[8px]' />
                      <a className='text-B-400'>{name}</a>
                    </div>
                  </Td>
                  <Td>
                    <span className='text-gray-800 font-500'>{price}</span>
                  </Td>
                  <Td>
                    <a href='#' className='truncate cursor-pointer text-B-400'>
                      {from}
                    </a>
                  </Td>
                  <Td>
                    <a href='#' className='truncate cursor-pointer text-B-400'>
                      {to}
                    </a>
                  </Td>
                  <Td align='right'>
                    <a className='cursor-pointer flex w-full font-500 items-center justify-end gap-[4px] text-B-400'>
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
