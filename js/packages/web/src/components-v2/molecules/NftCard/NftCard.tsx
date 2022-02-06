import React, { FC, forwardRef } from 'react';
import CN from 'classnames';
import VerifiedBadgeIcon from '../../icons/VerifiedBadge';

export interface NftCardProps {
  [x: string]: any;
}

export const NftCard: FC<NftCardProps> = forwardRef(
  (
    {
      className,
      name,
      description,
      itemsCount,
      floorPrice,
      isVerified,
      image,
      ...restProps
    }: NftCardProps,
    ref: any,
  ) => {
    const NftCardClasses = CN(
      `nft-card flex flex-col bg-gray-50 rounded-[12px] overflow-hidden h-full cursor-pointer hover:bg-gray-100 transition-all`,
      className,
    );

    return (
      <div className={NftCardClasses} {...restProps} ref={ref}>
        <div className="flex flex-col">
          <img
            src={image}
            alt={name}
            className="h-[228px] w-full object-cover object-center"
          />

          <span className="bg-[linear-gradient(89.57deg,_#3E9CD1_0.79%,_#224CB8_124%)] h-[8px] w-full" />
        </div>

        <div className="flex px-[28px] pt-[20px] pb-[28px] flex-col gap-[8px]">
          <h3 className="text-base flex gap-[8px]">
            <span className="line-clamp-1">{name}</span>

            {isVerified && (
              <VerifiedBadgeIcon
                width={16}
                height={16}
                className="flex-shrink-0 relative top-[4px]"
              />
            )}
          </h3>

          <p className="text-gray-600 text-md line-clamp-2">{description}</p>

          <div className="flex items-center text-gray-700 gap-[6px] text-md font-500">
            <span>{itemsCount} items</span>
            <span>|</span>
            <span>FP {floorPrice}</span>
          </div>
        </div>
      </div>
    );
  },
);

export default NftCard;
