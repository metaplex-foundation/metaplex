import React, { FC } from 'react'
import CN from 'classnames'

export interface CollageProps {
  [x: string]: any
  colCount?: 1 | 2 | 3 | 4 | 5 | 6
  id?: number | string
  image?: string
  list?: CollageProps[]
  rowHeight?: number
}

export const Collage: FC<CollageProps> = ({
  className,
  colCount,
  id,
  image,
  list,
  rowHeight,
  ...restProps
}: CollageProps) => {
  const CollageClasses = CN(`collage`, className, {})

  return (
    <div className={CollageClasses} {...restProps}>
      <ul
        className={CN('collage__list grid justify-between gap-[16px] md:gap-[32px]', {
          'grid-cols-1': colCount === 1,
          'grid-cols-2': colCount === 2,
          'grid-cols-3': colCount === 3,
          'grid-cols-4': colCount === 4,
          'grid-cols-5': colCount === 5,
          'grid-cols-6': colCount === 6,
        })}>
        {(list || []).map(({ id, image }, index) => {
          return (
            <li
              className='flex items-center w-full h-full'
              style={{ height: rowHeight }}
              key={id || index}>
              <img
                className='rounded-[12px] h-full w-full object-cover object-center'
                src={image}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

Collage.defaultProps = {
  colCount: 2,
  rowHeight: 300,
}

export default Collage
