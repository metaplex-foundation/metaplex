import React, { FC } from 'react';
import CN from 'classnames';
import VerifiedBadge from '../../icons/VerifiedBadge';

export interface ItemCardProps {
  [x: string]: any;
}

export const ItemCard: FC<ItemCardProps> = ({
  className,
  collection,
  dollarValue,
  image,
  isVerified,
  name,
  price,
  royalties,
  ...restProps
}: ItemCardProps) => {
  const ItemCardClasses = CN(`item-card flex w-full`, className);

  return (
    <div className={ItemCardClasses} {...restProps}>
      <div className="flex w-[96px] h-[96px] rounded-[8px] overflow-hidden flex-shrink-0">
        <img
          src={image}
          alt={name}
          className="object-cover object-center w-full h-full"
        />
      </div>

      <div className="flex w-full pl-[16px] justify-between items-center">
        <div className="flex flex-col">
          <div className="flex items-center gap-[4px]">
            <span className="font-500 text-B-400 text-h6">{collection}</span>
            {isVerified && <VerifiedBadge />}
          </div>
          <span className="text-gray-800 font-500 text-h6">{name}</span>
          <span className="text-gray-600">Royalties {royalties}</span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-lg text-gray-800 font-500">{price}</span>
          <span className="text-gray-600 text-md">{dollarValue}</span>
        </div>
      </div>
    </div>
  );
};

export default ItemCard;
