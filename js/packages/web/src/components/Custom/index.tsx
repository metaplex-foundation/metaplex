import React, { CSSProperties } from 'react';

export const TokenCircle = (props: { iconSize?: number , iconFile?: string, style?:CSSProperties}) => {
  const { iconSize = 24 ,iconFile=undefined, style={}} = props;
  const filePath = iconFile? iconFile:"/unknown_token.png"
  return (
    <span
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '50%',
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
