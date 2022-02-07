import React, { FC } from 'react';
import CN from 'classnames';
import { ItemCard } from '../../molecules/ItemCard';

export interface QuickBuyProps {
  [x: string]: any;
}

export const QuickBuy: FC<QuickBuyProps> = ({
  className,
  art,
  onSubmit,
  ...restProps
}: QuickBuyProps) => {
  const QuickBuyClasses = CN(
    `quick-buy w-full pt-[20px] flex flex-col`,
    className,
  );
  const { image, name, price } = art || {};

  const itemDetails = {
    image: image,
    isVerified: true,
    collection: 'Belugies',
    name: name,
    royalties: '2.5%',
    price: price,
    dollarValue: '$103.31',
  };

  return (
    <div className={QuickBuyClasses} {...restProps}>
      <div className="flex justify-between w-full text-base border-b border-gray-100 font-500 pb-[8px] mb-[16px]">
        <span>Item</span>
        <span>Price</span>
      </div>

      <div className="flex w-full mb-[16px] flex-col gap-[16px] overflow-auto max-h-[208px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <ItemCard {...itemDetails} />

        <span className="bg-red-50 px-[20px] py-[4px] rounded-full text-sm font-500 text-red-500 text-center flex items-center justify-center gap-[4px]">
          <i className="text-base ri-error-warning-fill" />
          <span>Insufficient balance</span>
        </span>
      </div>

      <div className="flex items-center justify-between w-full border-t border-gray-100 font-500 pt-[12px] text-gray-800">
        <span className="text-h6">You pay</span>
        <span className="text-lg">◎ .09</span>
      </div>

      <div className="flex justify-center pt-[20px]">
        <button
          className="appearance-none text-base bg-B-400 hover:bg-B-500 text-white font-500 h-[52px] px-[24px] w-full max-w-[220px] rounded-full"
          onClick={onSubmit}
        >
          Confirm checkout
        </button>
      </div>
    </div>
  );
};

export default QuickBuy;
