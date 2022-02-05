import React from 'react';

export const VerifiedBadge = ({
  width = 20,
  height = 20,
  color = '#448FFF',
  ...restProps
}: any) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...restProps}
    >
      <path
        d="M3.40063 1.8577L7.5 0.525731L11.5994 1.8577L14.1329 5.34483V9.65517L11.5994 13.1423L7.5 14.4743L3.40063 13.1423L0.867076 9.65517V5.34483L3.40063 1.8577Z"
        fill={color}
        stroke="white"
      />
      <path
        d="M4.77393 6.99612L7.10641 9.23455L10.7218 5.76498"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default VerifiedBadge;
