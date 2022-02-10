import React, { FC } from 'react';
import CN from 'classnames';
import { QuoteIcon } from '../../icons/QuoteIcon';

export interface QuoteProps {
  [x: string]: any;
  author: string;
  quote: string;
}

export const Quote: FC<QuoteProps> = ({
  className,
  quote,
  author,
  ...restProps
}: QuoteProps) => {
  const QuoteClasses = CN(
    `quote bg-gray-50 rounded-[8px] flex flex-col items-center px-[16px] md:px-[56px] lg:px-[80px] pb-[40px] w-full`,
    className,
    {},
  );

  return (
    <div className={QuoteClasses} {...restProps}>
      <span className="quote__icon text-B-500 pb-[28px] pt-[36px]">
        <QuoteIcon size={28} />
      </span>
      <p className="quote__text leading-[1.6] text-[18px] text-center text-N-600 pb-[14px]">
        {quote}
      </p>
      <p className="text-base quote__author text-B-400 font-500">-{author}-</p>
    </div>
  );
};

Quote.defaultProps = {};

export default Quote;
