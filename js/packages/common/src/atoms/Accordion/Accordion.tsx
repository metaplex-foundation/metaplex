import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Minus, Plus } from 'react-feather'

export interface AccordionProps {
  [x: string]: any
  heading?: string
  body?: string
}

export const Accordion: FC<AccordionProps> = ({
  className,
  heading,
  body,
  open,
  ...restProps
}: AccordionProps) => {
  const AccordionClasses = CN(`accordion w-full flex flex-col items-center`, className)

  const [isOpen, setIsOpen] = useState(open || false)

  return (
    <div className={AccordionClasses} {...restProps}>
      <div
        className={CN(
          'flex w-full cursor-pointer select-none items-center gap-[12px] rounded-[12px] border py-[12px] pl-[20px] transition-colors',
          {
            'border-N-200 text-N-800 bg-white': !isOpen,
            'border-N-700 bg-N-700 text-white': isOpen,
          }
        )}
        onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <Minus size={24} /> : <Plus size={24} />}
        <p
          className={CN('font-500 text-base', {
            'text-N-800': !isOpen,
            'text-white': isOpen,
          })}>
          {heading}
        </p>
      </div>

      <div
        className={CN(
          'border-N-200 flex w-[calc(100%-24px)] flex-col rounded-b-[12px] border border-t-0 bg-white px-[20px] pt-[16px] pb-[20px]',
          { hidden: !isOpen, flex: isOpen }
        )}>
        <p
          className='text-md font-400 w-full text-slate-800'
          dangerouslySetInnerHTML={{ __html: body || '' }}
        />
      </div>
    </div>
  )
}

Accordion.defaultProps = {}

export default Accordion
