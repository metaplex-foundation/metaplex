import React from 'react';
import { useEffect } from 'react';

import useWindowDimensions from '../../utils/layout';

import './index.less';

export const Banner = (props: {
  src: string;
  useBannerBg: boolean;
  children?: React.ReactNode;
}) => {
  const { width } = useWindowDimensions();

  useEffect(() => {
    const mainBg = document.getElementById('main-bg');
    if (mainBg && props.useBannerBg)
      mainBg.style.backgroundImage = `url(${props.src})`;

    return () => {
      const mainBg = document.getElementById('main-bg');
      if (mainBg && props.useBannerBg) mainBg.style.backgroundImage = '';
    };
  }, [props.src, props.useBannerBg]);

  return (
    <div id={'current-banner'} style={{ backgroundImage: `url(${props.src})` }}>
      <span id={'gradient-banner'}></span>
      <div id="banner-inner">{props.children}</div>
    </div>
  );
};
