import React from 'react';

export const SolCircle = (props: { iconSize?: number }) => {
  const { iconSize = 24 } = props;
  return (
    <span
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '50%',
        padding: `${iconSize / 4}px ${iconSize / 5}px`,
        height: iconSize,
        width: iconSize,
        display: 'inline-flex',
      }}
    >
      <img src="/sol-circle.svg" />
    </span>
  );
};
