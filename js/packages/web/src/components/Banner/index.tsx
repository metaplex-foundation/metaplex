import React, { ReactChildren } from 'react';
import { useEffect } from 'react';

import useWindowDimensions from '../../utils/layout';

import './index.less';

export const Banner = (props: {
  src: string,
  children?: ReactChildren,
}) => {
  const { width } = useWindowDimensions();

  useEffect(() => {
    const mainBg = document.getElementById("main-bg");
    if (mainBg) mainBg.style.backgroundImage = `url(${props.src})`;
  }, [props.src])
  return (
    <div>
      <img src={props.src} style={{
        height: width * 520 / 1344, // banner size
        width: "100%",
        borderRadius: 10,
      }} />
      {props.children}
    </div>
  );
};
