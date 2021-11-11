import React from 'react';

export const Banner = ({
  src,
  headingText,
  subHeadingText,
  actionComponent,
  children,
}: {
  src: string;
  headingText: string;
  subHeadingText: string;
  actionComponent?: JSX.Element;
  children?: React.ReactNode;
}) => {
  return (
    <div id="metaplex-banner">
      <img id="metaplex-banner-backdrop" src={src} />
      <div id="metaplex-banner-hero">
        <div>{headingText}</div>
        <div>{subHeadingText}</div>
        {actionComponent}
      </div>
      {children}
    </div>
  );
};
