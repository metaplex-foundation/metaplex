import React, { FC } from 'react';
import CN from 'classnames';

export interface ChipProps {
  [x: string]: any;
}

export const Chip: FC<ChipProps> = ({
  children,
  className,
  onClose,
  label,
  ...restProps
}: ChipProps) => {
  const ChipClasses = CN(
    `chip bg-white border border-N-100 h-[32px] inline-flex pl-[16px] items-center justify-center rounded-full text-md font-500 overflow-hidden flex-shrink-0 hover:bg-gray-50 cursor-pointer transition-all`,
    className,
    {
      'pr-[16px]': !onClose,
    }
  );

  return (
    <div className={ChipClasses} {...restProps}>
      <div className="flex items-center gap-[4px]">
        {label && <span className="text-sm text-gray-700">{`${label} /`}</span>}
        <span className='text-gray-700'>{children}</span>
      </div>

      {onClose && (
        <button className='appearance-none pl-[4px] pr-[8px] flex items-center justify-center hover:text-B-400 '>
          <i className="ri-close-line" />
        </button>
      )}
    </div>
  );
};

export default Chip;
