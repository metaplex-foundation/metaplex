import React from 'react';
import { useEffect } from 'react';

export const Banner = (props: {
  src: string;
  useBannerBg: boolean;
  headingText: string;
  subHeadingText: string;
  actionComponent?: JSX.Element;
  children?: React.ReactNode;
}) => {
  return (
    <>
      <div>
        <img src={props.src} />
        <div>
          <div>{props.headingText}</div>
          <div>{props.subHeadingText}</div>
          {props.actionComponent}
        </div>
      </div>
      <div style={{ backgroundImage: `url(${props.src})` }}>
        <div>
          <div>{props.headingText}</div>
          <div>{props.subHeadingText}</div>
          {props.actionComponent}
        </div>
        {props.children}
        <div>
          <span>
            POWERED BY <b>METAPLEX</b>
          </span>
        </div>
      </div>
    </>
  );
};
