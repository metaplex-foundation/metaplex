import React from 'react';
import { useEffect } from 'react';

import useWindowDimensions from '../../utils/layout';

import './index.less';

export const Banner = (props: {
  src: string,
  children?: React.ReactNode,
}) => {
  const { width } = useWindowDimensions();

  useEffect(() => {
    const mainBg = document.getElementById("main-bg");
    if (mainBg) mainBg.style.backgroundImage = `url(${props.src})`;
  }, [props.src])
  return (
    <div style={{
      width: "100%",
      height: Math.min(width, 1440) * 520 / 1344, // banner size
      borderRadius: 10,
      position: "relative",
    }}>
      <img src={props.src} width="100%" style={{
        position: "absolute",
      }}/>
      <div style={{
        position: "relative",
        height: "inherit",
      }}>
        {props.children}
      </div>
    </div>
  );
};
