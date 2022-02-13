import React, { FC } from 'react';
import CN from 'classnames';
import { Table, Th, Td } from '../../atoms/Table';
import { nftOffersTable } from '../../../../dummy-data/nft-offers-table';

export interface NftOffersTableProps {
  [x: string]: any;
}

export const NftOffersTable: FC<NftOffersTableProps> = ({
  className,
  ...restProps
}: NftOffersTableProps) => {
  const NftOffersTableClasses = CN(
    `nft-offers-table h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-[16px]`,
    className,
  );

  return (
    <div className={NftOffersTableClasses} {...restProps}>
      <Table>
        <thead className="font-semibold text-gray-400 text-md">
          <tr className="group">
            <Th align="left">Username</Th>
            <Th>Price</Th>
            <Th>Floor difference</Th>
            <Th>Expiration</Th>
            <Th align="right">{}</Th>
          </tr>
        </thead>
        <tbody>
          {nftOffersTable.map(
            (
              {
                username,
                price,
                priceInDollars,
                expiration,
                floorDifference,
                floorDifferenceType,
              }: any,
              index: number,
            ) => {
              return (
                <tr key={index} className="odd:bg-[#F4FAFF] group">
                  <Td align="left">
                    <a
                      href="#"
                      className="truncate cursor-pointer font-500 text-B-400"
                    >
                      {username}
                    </a>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-[8px]">
                      <span className="text-gray-800 font-500">{price}</span>
                      <span className="text-sm text-gray-600 font-500">
                        ({priceInDollars})
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-[4px] text-B-400">
                      <span className="inline-flex">{floorDifference}</span>

                      <span className="inline-flex">
                        {floorDifferenceType === 'above' && (
                          <i className="inline-flex ri-arrow-up-line" />
                        )}
                        {floorDifferenceType === 'below' && (
                          <i className="inline-flex ri-arrow-down-line" />
                        )}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className="truncate cursor-pointer text-B-400">
                      {expiration}
                    </span>
                  </Td>
                  <Td align="right">
                    <div className="flex items-center gap-[8px]">
                      <button className="appearance-none text-sm bg-B-400 hover:bg-B-500 text-white font-500 h-[28px] px-[16px] rounded-full">
                        Accept
                      </button>

                      <button className="appearance-none text-sm bg-slate-200  hover:bg-slate-300 text-slate-600 font-500 h-[28px] px-[12px] rounded-full">
                        <i className="ri-delete-bin-7-line" />
                      </button>
                    </div>
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

export default NftOffersTable;
