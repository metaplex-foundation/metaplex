import React, { FC } from 'react';
import CN from 'classnames';
import { Table, Th, Td } from '../../atoms/Table';
import { Badge } from '../../atoms/Badge';
import { nftActivityTable } from '../../../../dummy-data/nft-activity-table';

export interface NftActivityTableProps {
  [x: string]: any;
}

export const NftActivityTable: FC<NftActivityTableProps> = ({
  className,
  ...restProps
}: NftActivityTableProps) => {
  const NftActivityTableClasses = CN(
    `nft-activity-table h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-[16px]`,
    className,
  );

  const renderEvent = (event: any) => {
    let element: any = null;

    switch (event) {
      case 'Sale':
        element = (
          <Badge
            className="w-[100px]"
            appearance="success"
            iconBefore={<i className="ri-shopping-cart-line" />}
          >
            {event}
          </Badge>
        );
        break;

      case 'Transfer':
        element = (
          <Badge
            className="w-[100px]"
            appearance="secondary"
            iconBefore={<i className="ri-arrow-left-right-line" />}
          >
            {event}
          </Badge>
        );
        break;

      default:
        break;
    }

    return element;
  };

  return (
    <div className={NftActivityTableClasses} {...restProps}>
      <Table>
        <thead className="font-semibold text-gray-400 text-md">
          <tr className="group">
            <Th align="left">Event</Th>
            <Th>Price</Th>
            <Th>From</Th>
            <Th>To</Th>
            <Th align="right">Date</Th>
          </tr>
        </thead>
        <tbody>
          {nftActivityTable.map(
            ({ event, price, from, to, time }: any, index: number) => {
              return (
                <tr key={index} className="odd:bg-[#F4FAFF] group">
                  <Td align="left">
                    <div className="inline-flex items-center gap-[12px]">
                      {renderEvent(event)}
                    </div>
                  </Td>
                  <Td>
                    <span className="text-gray-800 font-500">{price}</span>
                  </Td>
                  <Td>
                    <a href="#" className="truncate cursor-pointer text-B-400">
                      {from}
                    </a>
                  </Td>
                  <Td>
                    <a href="#" className="truncate cursor-pointer text-B-400">
                      {to}
                    </a>
                  </Td>
                  <Td align="right">
                    <a className="cursor-pointer flex w-full font-500 items-center justify-end gap-[4px] text-B-400">
                      {time} <i className="ri-arrow-right-up-line" />
                    </a>
                  </Td>
                </tr>
              );
            },
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default NftActivityTable;
