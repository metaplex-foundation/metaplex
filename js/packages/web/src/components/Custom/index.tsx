import React from 'react';

export const TokenCircle = (props: { iconSize?: number , iconFile?: string}) => {
  const { iconSize = 24 ,iconFile=undefined} = props;
  const padding = iconFile? "": `${iconSize / 4}px ${iconSize / 5}px`
  const filePath = iconFile? iconFile:"/sol-circle.svg"
  //console.log("ICONS", iconFile, padding)
  return (
    <span
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '50%',
        padding: padding,
        height: iconSize,
        width: iconSize,
        display: 'inline-flex',
        overflow: 'hidden'
      }}
    >
      <img src={filePath}/>
    </span>
  );
};
