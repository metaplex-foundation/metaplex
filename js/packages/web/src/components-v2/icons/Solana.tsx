import React from 'react'

export const Solana = ({ width = 20, height = 20, ...restProps }: any) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 399 313'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      {...restProps}
    >
      <path
        d='M65.281 238.743C67.714 236.311 71.014 234.946 74.454 234.946H391.851C397.633 234.946 400.527 241.937 396.437 246.024L333.72 308.691C331.287 311.123 327.987 312.489 324.547 312.489H7.14999C1.36799 312.489 -1.52601 305.497 2.56399 301.41L65.281 238.743Z'
        fill='url(#paint0_linear_26_16)'
      />
      <path
        d='M65.281 4.62249C67.714 2.19099 71.014 0.825195 74.454 0.825195H391.851C397.633 0.825195 400.527 7.81689 396.437 11.904L333.72 74.571C331.287 77.002 327.987 78.368 324.547 78.368H7.14999C1.36799 78.368 -1.52601 71.377 2.56399 67.29L65.281 4.62249Z'
        fill='url(#paint1_linear_26_16)'
      />
      <path
        d='M333.72 120.937C331.287 118.506 327.987 117.14 324.547 117.14H7.14999C1.36799 117.14 -1.52601 124.132 2.56399 128.218L65.281 190.886C67.714 193.317 71.014 194.683 74.454 194.683H391.851C397.633 194.683 400.527 187.691 396.437 183.604L333.72 120.937Z'
        fill='url(#paint2_linear_26_16)'
      />
      <defs>
        <linearGradient
          id='paint0_linear_26_16'
          x1='269.52'
          y1='33.14'
          x2='49.854'
          y2='453.889'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='#00FFA3' />
          <stop offset='1' stopColor='#DC1FFF' />
        </linearGradient>
        <linearGradient
          id='paint1_linear_26_16'
          x1='269.52'
          y1='-200.98'
          x2='49.8549'
          y2='219.768'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='#00FFA3' />
          <stop offset='1' stopColor='#DC1FFF' />
        </linearGradient>
        <linearGradient
          id='paint2_linear_26_16'
          x1='269.52'
          y1='-84.6657'
          x2='49.854'
          y2='336.083'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='#00FFA3' />
          <stop offset='1' stopColor='#DC1FFF' />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default Solana
