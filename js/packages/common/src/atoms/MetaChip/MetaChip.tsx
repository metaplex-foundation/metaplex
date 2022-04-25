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
  subHeadingClassName?: string
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
  subHeadingClassName,
  ...restProps
}: MetaChipProps) => {
  const MetaChipClasses = CN(`meta-chip flex flex-col`, className, {
    'text-left items-left': align === 'left',
    'text-right items-end': align === 'right',
    'text-center items-center': align === 'center',
  })

  return (
    <div className={MetaChipClasses} {...restProps}>
      {overline && (
        <span
          className={CN('font-500 text-sm text-slate-600', commonClassName)}
          dangerouslySetInnerHTML={{ __html: overline }}
        />
      )}

      {heading && typeof heading === 'string' && (
        <h3
          className={CN(
            'text-h4 font-600 leading-[normal] text-slate-900',
            headingClassName,
            commonClassName
          )}
          dangerouslySetInnerHTML={{ __html: heading }}
        />
      )}

      {heading && typeof heading !== 'string' && (
        <h3
          className={CN(
            'text-h4 font-600 leading-[normal] text-slate-900',
            headingClassName,
            commonClassName
          )}>
          {heading}
        </h3>
      )}

      {subHeading && typeof subHeading === 'string' && (
        <h3
          className={CN(
            'text-h6 font-600 leading-[normal] tracking-tighter',
            commonClassName,
            subHeadingClassName
          )}
          dangerouslySetInnerHTML={{ __html: subHeading }}
        />
      )}

      {subHeading && typeof subHeading !== 'string' && (
        <h3
          className={CN(
            'text-h6 font-600 leading-[normal] tracking-tighter',
            commonClassName,
            subHeadingClassName
          )}>
          {subHeading}
        </h3>
      )}

      {description && (
        <span
          className={CN('font-500 text-base text-slate-700', commonClassName)}
          dangerouslySetInnerHTML={{ __html: description }}
        />
      )}

      {hint && (
        <p
          className={CN('font-500 text-sm text-slate-600', commonClassName)}
          dangerouslySetInnerHTML={{ __html: hint || '' }}
        />
      )}
    </div>
  )
}

MetaChip.defaultProps = {
  align: 'left',
}

export default MetaChip
