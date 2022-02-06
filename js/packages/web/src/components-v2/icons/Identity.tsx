import React from 'react';

export const Identity = ({ width = 30, height = 21, ...restProps }: any) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 30 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...restProps}
    >
      <rect y="4" width="26" height="17" rx="3" fill="#448FFF" />
      <path
        d="M22 10L15 10"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M19 14H15"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="7.54352"
        cy="9.63043"
        r="1.63043"
        fill="white"
        stroke="white"
        strokeWidth="2"
      />
      <path
        d="M5.3913 14.2175H9.69565C10.464 14.2175 11.087 14.8404 11.087 15.6088C11.087 16.3772 10.464 17.0001 9.69565 17.0001H5.3913C4.62291 17.0001 4 16.3772 4 15.6088C4 14.8404 4.62291 14.2175 5.3913 14.2175Z"
        fill="white"
        stroke="white"
        strokeWidth="2"
      />
      <circle cx="26" cy="4" r="3.5" fill="#84DE4D" stroke="white" />
    </svg>
  );
};

export default Identity;
