import React, { FC } from 'react'
import CN from 'classnames'

import styles from './Hamburger.module.scss'

interface HamburgerProps {
  [x: string]: any
  width?: number
  height?: number
}

export const Hamburger: FC<HamburgerProps> = ({
  className,
  width,
  height,
  ...restProps
}: HamburgerProps) => {
  const HamburgerClasses = CN(styles['hamburger'], 'relative cursor-pointer', className, {})

  return (
    <>
      <div className={HamburgerClasses} style={{ width: width, height: height }} {...restProps}>
        <input
          className={CN(
            'absolute z-[2] block h-full w-full cursor-pointer opacity-0',
            styles.hamburger__checkbox
          )}
          type='checkbox'
        />

        <div className='absolute bottom-0 left-0 right-0 top-0 m-auto h-[8px] w-[32px]'>
          <span className='absolute block h-[2px] w-full rounded-[20px] bg-N-800'></span>
          <span className='absolute block h-[2px] w-full rounded-[20px] bg-N-800'></span>
        </div>
      </div>

      <span className='ml-2 font-500 text-N-800 lg:hidden'>Menu</span>
    </>
  )
}

Hamburger.defaultProps = {
  width: 32,
  height: 18,
}

export default Hamburger
