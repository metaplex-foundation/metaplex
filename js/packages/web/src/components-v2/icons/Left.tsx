import React from 'react';

export const Left = ({
  width = 26,
  height = 26,
  color = 'currentColor',
  ...restProps
}: any) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...restProps}
    >
      <path d="M17 3L7 13L17 23" stroke={color} strokeLinecap="round" />
    </svg>
  );
};

export default Left;
