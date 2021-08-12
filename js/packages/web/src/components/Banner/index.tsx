import React from 'react';
import { useEffect } from 'react';

import useWindowDimensions from '../../utils/layout';

import './index.less';
import { HowToBuyModal } from '../HowToBuyModal';

export const Banner = (props: {
  src: string;
  useBannerBg: boolean;
  headingText: string;
  subHeadingText: string;
  actionComponent?: JSX.Element;
  children?: React.ReactNode;
}) => {
  const { width } = useWindowDimensions();

  useEffect(() => {
    const mainBg = document.getElementById('main-bg');
    const gradient = document.getElementById('bg-gradient');
    if (mainBg && props.useBannerBg) {
      mainBg.style.backgroundImage = `url(${props.src})`;
      mainBg.style.display = 'inline-block';
      if (gradient) {
        gradient.style.display = 'inline-block';
      }
    }

    return () => {
      const mainBg = document.getElementById('main-bg');
      const gradient = document.getElementById('bg-gradient');
      if (mainBg && props.useBannerBg) mainBg.style.backgroundImage = '';
      if (gradient) gradient.style.display = 'none';
    };
  }, [props.src, props.useBannerBg]);

  return (
    <div id={'current-banner'} style={{ backgroundImage: `url(${props.src})` }}>
      <span id={'gradient-banner'}></span>
      <div id="banner-inner">
        <div id={'message-container'}>
          <div id={'main-heading'}>{props.headingText}</div>
          <div id={'sub-heading'}>{props.subHeadingText}</div>
          {props.actionComponent}
        </div>
        {props.children}
      </div>
    </div>
  );
};
