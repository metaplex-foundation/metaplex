import React, { FC } from 'react'
import CN from 'classnames'
import { QuoteIcon } from '../../icons'

export interface QuoteProps {
  [x: string]: any
  author: string
  quote: string
}

export const Quote: FC<QuoteProps> = ({ className, quote, author, ...restProps }: QuoteProps) => {
  const QuoteClasses = CN(
    `quote bg-Y-10 rounded-[12px] flex flex-col items-center px-[16px] md:px-[56px] lg:px-[80px] pb-[32px] w-full relative`,
    className,
    {}
  )

  return (
    <div className={QuoteClasses} {...restProps}>
      <span className='quote__icon absolute top-[-80px] pb-[28px] pt-[36px] text-slate-800'>
        <QuoteIcon size={80} />
      </span>
      <p className='quote__text text-h5 pb-[40px] pt-[52px] text-center text-slate-800 md:text-lg'>
        {quote}
      </p>
      <p className='text-h5 quote__author font-600 text-slate-800'>-{author}-</p>
    </div>
  )
}

Quote.defaultProps = {}

export default Quote
