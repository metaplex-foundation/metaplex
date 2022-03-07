import React from 'react'

export const Left = ({ width = 26, height = 26, color = 'currentColor', ...restProps }: any) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 25 44'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...restProps}
    >
      <path d='M23 42L3 22L23 2' stroke={color} strokeWidth='3' strokeLinecap='round' />
    </svg>
  )
}

export default Left
