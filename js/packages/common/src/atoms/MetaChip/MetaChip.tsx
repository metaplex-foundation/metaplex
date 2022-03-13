import React, { FC } from 'react'
import CN from 'classnames'

export interface MetaChipProps {
  [x: string]: any
  align?: 'left' | 'center' | 'right'
  commonClassName?: string
  description?: string
  heading?: any
  headingClassName?: string
  hint?: string
  overline?: string
  subHeading?: any
}

export const MetaChip: FC<MetaChipProps> = ({
  align,
  className,
  commonClassName,
  description,
  heading,
  headingClassName,
  hint,
  overline,
  subHeading,
  ...restProps
}: MetaChipProps) => {
  const MetaChipClasses = CN(`meta-chip flex flex-col`, className, {
    'text-left': align === 'left',
    'text-right': align === 'right',
    'text-center': align === 'center',
  })

  return (
    <div className={MetaChipClasses} {...restProps}>
      {overline && (
        <span
          className={CN('mb-[4px] text-sm font-500 text-N-700', commonClassName)}
          dangerouslySetInnerHTML={{ __html: overline }}
        />
      )}

      {heading && typeof heading === 'string' && (
        <h3
          className={CN('mb-[4px] text-h3 leading-[normal]', headingClassName, commonClassName)}
          dangerouslySetInnerHTML={{ __html: heading }}
        />
      )}

      {heading && typeof heading !== 'string' && (
        <h3 className={CN('mb-[4px] text-h3 leading-[normal]', headingClassName, commonClassName)}>
          {heading}
        </h3>
      )}

      {subHeading && typeof subHeading === 'string' && (
        <h3
          className={CN('text-h5 font-700 leading-[normal]', commonClassName)}
          dangerouslySetInnerHTML={{ __html: subHeading }}
        />
      )}

      {subHeading && typeof subHeading !== 'string' && (
        <h3 className={CN('text-h5 font-700 leading-[normal]', commonClassName)}>{subHeading}</h3>
      )}

      {description && (
        <span
          className={CN('text-base text-N-700', commonClassName)}
          dangerouslySetInnerHTML={{ __html: description }}
        />
      )}

      {hint && (
        <p
          className={CN('text-sm font-500 text-N-600', commonClassName)}
          dangerouslySetInnerHTML={{ __html: hint }}
        />
      )}
    </div>
  )
}

MetaChip.defaultProps = {
  align: 'left',
}

export default MetaChip
