import React, { FC } from 'react'
import CN from 'classnames'
import { Button } from '../../atoms/Button'
import { Link } from 'react-router-dom'

export interface PaginationProps {
  [x: string]: any
  pages?: any[]
  prevLink?: string
  nextLink?: string
}

export const Pagination: FC<PaginationProps> = ({
  className,
  pages,
  prevLink,
  nextLink,
  ...restProps
}: PaginationProps) => {
  const PaginationClasses = CN(`pagination flex item-center gap-[4px]`, className)

  return (
    <div className={PaginationClasses} {...restProps}>
      <Link to={prevLink || ''}>
        <Button appearance='ghost' isSquare isRounded={false}>
          <i className='ri-arrow-left-s-line text-lg' />
        </Button>
      </Link>

      {pages?.map(({ label, link, isActive, isDots, ...restProps }: any, index: number) => {
        return (
          <Link key={index} to={link || ''}>
            <Button
              appearance={isActive ? 'neutral' : 'ghost'}
              isSquare
              isRounded={false}
              {...restProps}>
              {isDots ? '...' : label}
            </Button>
          </Link>
        )
      })}

      <Link to={nextLink || ''}>
        <Button appearance='ghost' isSquare isRounded={false}>
          <i className='ri-arrow-right-s-line text-lg' />
        </Button>
      </Link>
    </div>
  )
}

Pagination.defaultProps = {}

export default Pagination
