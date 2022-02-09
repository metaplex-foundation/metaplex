import React, { FC } from 'react';
import CN from 'classnames';

export interface AttributesCardProps {
  [x: string]: any;
}

export const AttributesCard: FC<AttributesCardProps> = ({
  className,
  list,
  ...restProps
}: AttributesCardProps) => {
  const AttributesCardClasses = CN(
    `attributes-card w-full grid grid-cols-2 gap-[8px] p-[20px] bg-gray-50 border border-gray-100 rounded-[8px]`,
    className,
  );

  return (
    <div className={AttributesCardClasses} {...restProps}>
      {(list || []).map(({ id, label, value }: any, index: number) => (
        <div
          key={id || index}
          className="flex justify-center items-center flex-col border border-B-200 px-[12px] py-[6px] rounded-[8px] bg-B-10"
        >
          <span className="w-full text-center text-gray-700 text-md">
            {label}
          </span>
          <span className="w-full text-center text-gray-900 text-md font-500">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default AttributesCard;
