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
  headingLabelClassName,
  bodyClassName,
  iconAlign,
  ...restProps
}: AccordionProps) => {
  const AccordionClasses = CN(
    `accordion w-full flex flex-col gap-[12px]`,
    className,
  );
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const renderChildren = (children: any) => {
    if (typeof children === 'function') {
      return children({ isOpen });
    }
    return children;
  };

  const renderIcon = () => {
    if (isOpen) {
      return <TopIcon width={20} height={20} />;
    }

    return <DownIcon width={20} height={20} />;
  };

  return (
    <div className={AccordionClasses} {...restProps}>
      <div
        className={CN(
          'flex items-center w-full text-gray-700 cursor-pointer select-none',
          headingClassName,
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {iconAlign === 'left' && <span>{renderIcon()}</span>}

        <span
          className={CN('text-base', headingLabelClassName, {
            'pl-[20px]': iconAlign === 'left',
            'pr-[20px]': iconAlign === 'right',
          })}
        >
          {heading}
        </span>

        {iconAlign === 'right' && (
          <span className="ml-auto">{renderIcon()}</span>
        )}
      </div>

      <div
        className={CN('flex w-full transition-all', bodyClassName, {
          hidden: !isOpen,
          flex: isOpen,
        })}
      >
        {renderChildren(children)}
      </div>
    </div>
  );
};

Accordion.defaultProps = {
  iconAlign: 'right',
};

export default Accordion;
