import React from 'react'

export const Top = ({ width = 26, height = 26, color = 'currentColor', ...restProps }: any) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 26 26'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...restProps}
    >
      <path d='M23 18L13 8L3 18' stroke={color} strokeLinecap='round' />
    </svg>
  )
}

export default Top
