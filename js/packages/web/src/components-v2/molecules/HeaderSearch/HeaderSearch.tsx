import React, { FC } from 'react';
import CN from 'classnames';
import { TextField } from '../../atoms/TextField';

export interface HeaderSearchProps {
  [x: string]: any;
}

export const HeaderSearch: FC<HeaderSearchProps> = ({
  className,
  ...restProps
}: HeaderSearchProps) => {
  const HeaderSearchClasses = CN(`header-search w-[380px]`, className);

  return (
    <div className={HeaderSearchClasses} {...restProps}>
      <TextField
        iconBefore={<i className="text-white ri-search-line" />}
        placeholder="Search Collections"
        size="sm"
        wrapperClassName="!rounded-[4px] border-2 border-transparent !bg-white/20 !w-full focus-within:!bg-B-600/60 focus-within:!border-2 focus-within:!border-white"
        className="placeholder:!text-white/70 focus:placeholder:!text-white/50 placeholder:font-400 text-white"
      />
    </div>
  );
};

export default HeaderSearch;
