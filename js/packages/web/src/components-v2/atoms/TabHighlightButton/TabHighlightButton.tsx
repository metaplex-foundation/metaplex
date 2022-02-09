import React, { FC } from 'react';
import CN from 'classnames';

export interface TabHighlightButtonProps {
  [x: string]: any;
}

export const TabHighlightButton: FC<TabHighlightButtonProps> = ({
  className,
  children,
  isActive,
  onClick,
  ...restProps
}: TabHighlightButtonProps) => {
  const TabHighlightButtonClasses = CN(
    'tab-highlight-button cursor-pointer flex flex-col px-[12px] pb-[8px] relative select-none',
    {
      'text-gray-800': isActive,
      'text-gray-500 hover:text-gray-700': !isActive,
    },
    className,
  );

  return (
    <div className={TabHighlightButtonClasses} {...restProps} onClick={onClick}>
      <span>{children}</span>

      <span
        className={CN(
          'bg-[linear-gradient(89.57deg,_#3E9CD1_0.79%,_#224CB8_124%)] h-[4px] w-full rounded-full absolute left-0 right-0 bottom-0 opacity-0 transition-all',
          {
            'opacity-[1]': isActive,
          },
        )}
      />
    </div>
  );
};

export default TabHighlightButton;
