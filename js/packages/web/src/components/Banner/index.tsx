import React from 'react';

import './index.less';

export const Banner = (props: any) => {
  return (
    <div id={'current-banner'} style={{ backgroundImage: `url(${props.src})` }}>
      <span id={'gradient-banner'}></span>
      <div id="banner-inner">{props.children}</div>
    </div>
  );
};
