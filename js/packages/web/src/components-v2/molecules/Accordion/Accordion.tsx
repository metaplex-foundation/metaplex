import React, { FC, useState } from 'react';
import CN from 'classnames';
import TopIcon from '../../icons/Top';
import DownIcon from '../../icons/Down';

export interface AccordionProps {
  [x: string]: any;
}

export const Accordion: FC<AccordionProps> = ({
  className,
  children,
  heading,
  defaultOpen,
  headingClassName,
  ...restProps
}: AccordionProps) => {
  const AccordionClasses = CN(
    `accordion w-full flex flex-col gap-[12px]`,
    className,
  );
  const [isOpen, setIsOpen] = useState(defaultOpen || false);

  return (
    <div className={AccordionClasses} {...restProps}>
      <div
        className={CN(
          'flex justify-between w-full text-gray-700 cursor-pointer select-none',
          headingClassName,
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-base">{heading}</span>
        {isOpen ? (
          <TopIcon width={20} height={20} />
        ) : (
          <DownIcon width={20} height={20} />
        )}
      </div>

      <div
        className={CN('flex w-full transition-all', {
          hidden: !isOpen,
          flex: isOpen,
        })}
      >
        {children}
      </div>
    </div>
  );
};

export default Accordion;
