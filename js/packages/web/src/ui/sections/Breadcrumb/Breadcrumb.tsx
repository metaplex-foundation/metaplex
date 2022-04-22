import React, { FC } from 'react'
import CN from 'classnames'

export interface BreadcrumbItemProps {
  [x: string]: any
  id?: number | string
  isActive?: boolean
  link: string
  linkText: string
}

export interface BreadcrumbProps {
  [x: string]: any
  links: BreadcrumbItemProps[]
}

export const Breadcrumb: FC<BreadcrumbProps> = ({
  className,
  links,
  ...restProps
}: BreadcrumbProps) => {
  const BreadcrumbClasses = CN(`breadcrumb bg-N-50 w-full lg:px-[96px] py-[20px]`, className)

  const linksList = [
    {
      id: 0,
      linkText: 'Home',
      link: '/',
      isActive: false,
    },
    {
      id: 1,
      linkText: 'Sample',
      link: '/sample',
      isActive: false,
    },
    {
      id: 2,
      linkText: 'Facility',
      link: '/facility',
      isActive: false,
    },
    {
      id: 3,
      linkText: 'Wardrobes',
      link: '/wardrobes',
      isActive: true,
    },
  ]

  return (
    <div className={BreadcrumbClasses} {...restProps}>
      <div className='container'>
        <ul className='flex gap-[4px] text-md font-500'>
          {(links || linksList).map(({ id, linkText, link, isActive }, index) => {
            return (
              <li className='flex items-center group' key={id || index}>
                <a
                  className={CN(`breadcrumb__item`, {
                    'text-slate-500 hover:text-B-500': !isActive,
                    'text-B-400': isActive,
                  })}
                  href={link}>
                  {linkText}
                </a>
                <span className='px-[4px] text-slate-500 group-last:hidden'>/</span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

Breadcrumb.defaultProps = {}

export default Breadcrumb
