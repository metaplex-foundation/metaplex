import React from 'react';

export const Right = ({
  width = 26,
  height = 26,
  color = 'currentColor',
  ...restProps
}: any) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 25 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...restProps}
    >
      <path
        d="M2 2L22 22L2 42"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default Right;
