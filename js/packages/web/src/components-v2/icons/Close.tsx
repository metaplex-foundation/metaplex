import React from 'react'

export const Close = ({ width = 26, height = 26, color = 'currentColor', ...restProps }: any) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 27 27'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...restProps}
    >
      <path d='M1 1L26.5 26.5' stroke={color} strokeLinecap='round' />
      <path d='M26.5 1L0.999999 26.5' stroke={color} strokeLinecap='round' />
    </svg>
  )
}

export default Close
