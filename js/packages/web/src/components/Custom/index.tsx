import React, { CSSProperties } from 'react';

export const TokenCircle = (props: { iconSize?: number , iconFile?: string, style?:CSSProperties}) => {
  const { iconSize = 24 ,iconFile=undefined, style={}} = props;
  const padding = iconFile? "": `${iconSize / 4}px ${iconSize / 5}px`
  const filePath = iconFile? iconFile:"/sol-circle.svg"
  return (
    <span
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '50%',
        padding: padding,
        height: iconSize,
        width: iconSize,
        display: 'inline-flex',
        overflow: 'hidden',
        ...style
      }}
    >
      <img src={filePath}/>
    </span>
  );
};
