import React, { FC } from 'react'
import CN from 'classnames'
import { Link } from 'react-router-dom'

export interface LinkListProps {
  [x: string]: any
  direction?: 'vertical' | 'horizontal'
  list?: any[]
}

export const LinkList: FC<LinkListProps> = ({
  className,
  direction,
  list,
  labelClassName,
  ...restProps
}: LinkListProps) => {
  const LinkListClasses = CN(`link-list`, className, {})

  const DirectionClassName =
    (direction === 'horizontal' && 'flex flex-row') || (direction === 'vertical' && 'flex flex-col')

  return (
    <div className={LinkListClasses} {...restProps}>
      <ul className={CN('link-list__items', DirectionClassName)}>
        {(list || []).map(({ id, url, label }, index) => {
          return (
            <li
              className='text-N-600 hover:text-B-400 mb-[12px] cursor-pointer text-base'
              key={id || index}>
              <Link to={url || ''}>
                <a className={CN(labelClassName)}>{label}</a>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

LinkList.defaultProps = {}

export default LinkList
