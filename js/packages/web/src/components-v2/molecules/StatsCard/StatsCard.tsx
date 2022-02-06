import React, { FC } from 'react';
import CN from 'classnames';

export interface StatsCardProps {
  [x: string]: any;
}

export const StatChip = ({ label, value, hasCurrency }: any) => {
  return (
    <div className="flex flex-col border-r border-gray-200 last:border-r-0 px-[24px] flex-shrink-0 justify-center text-center">
      <label className="w-full text-center flex justify-center items-center text-lg text-gray-800 font-600 gap-[4px]">
        {hasCurrency && '◎'} {value}
      </label>
      <span className="flex justify-center w-full text-center text-gray-700">
        {label}
      </span>
    </div>
  );
};

export const StatsCard: FC<StatsCardProps> = ({
  className,
  ...restProps
}: StatsCardProps) => {
  const StatsCardClasses = CN(
    `stats-card flex py-[32px] bg-gray-50 flex-shrink-0 rounded-[12px] px-[12px]`,
    className,
  );

  return (
    <div className={StatsCardClasses} {...restProps}>
      <StatChip label="Items" value="8k" />
      <StatChip label="Owners" value="3.2k" />
      <StatChip label="Floor price" value="0.35" hasCurrency />
      <StatChip label="Total volume" value="8.2k" hasCurrency />
    </div>
  );
};

export default StatsCard;
