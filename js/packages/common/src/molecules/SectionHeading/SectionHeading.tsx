import React, { FC } from 'react'
import CN from 'classnames'
import { Tag, BlinkIndicatorProps } from '../../atoms'

export interface SectionHeadingProps {
  [x: string]: any
  align?: 'left' | 'center' | 'right'
  description?: string
  heading?: string
  overline?: string
  headingClassName?: string
  commonClassName?: string
  actions?: any
  indicator?: BlinkIndicatorProps
}

export const SectionHeading: FC<SectionHeadingProps> = ({
  align,
  className,
  description,
  heading,
  overline,
  actions,
  headingClassName,
  indicator,
  commonClassName,
  ...restProps
}: SectionHeadingProps) => {
  const SectionHeadingClasses = CN(`section-heading w-full`, className)

  return (
    <div className={SectionHeadingClasses} {...restProps}>
      <div
        className={CN(
          'container flex items-center justify-between gap-[40px]',
          {
            'flex-col items-center text-center': align === 'center',
          },
          commonClassName
        )}>
        <div
          className={CN('flex flex-col gap-[4px]', {
            'flex-col items-center text-center': align === 'center',
          })}>
          {overline && (
            <span
              className={CN('font-500 text-N-700 text-lg', commonClassName)}
              dangerouslySetInnerHTML={{ __html: overline || '' }}
            />
          )}

          {heading && (
            <div className='flex items-center gap-[12px]'>
              <h2
                className={CN(
                  'text-display-base font-400 text-N-800',
                  headingClassName,
                  commonClassName
                )}
                dangerouslySetInnerHTML={{ __html: heading || '' }}
              />
              {indicator && (
                <Tag hasIndicator className='mt-[5px]' appearance={indicator?.appearance}>
                  {indicator?.children}
                </Tag>
              )}
            </div>
          )}

          {description && (
            <p
              className={CN(
                'font-400 text-N-700 max-w-[700px] pt-[40px] text-base',
                commonClassName
              )}
              dangerouslySetInnerHTML={{ __html: description || '' }}
            />
          )}
        </div>

        {actions && (
          <div
            className={CN(
              'flex flex-shrink-0 items-center',
              {
                'flex-col items-center text-center': align === 'center',
                'ml-auto': align === 'left',
              },
              commonClassName
            )}>
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

SectionHeading.defaultProps = {
  heading: 'Heading',
  align: 'left',
}

export default SectionHeading
