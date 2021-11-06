import React, { HTMLProps } from 'react';
import Masonry, { MasonryProps } from 'react-masonry-css';

const COL_BREAKPOINTS = {
  // [ <width> | 'default' ]: <num-cols>
  default: 4,
  1100: 3,
  700: 2,
  500: 1,
};

const CLASS_NAME = 'metaplex-masonry';

export const MetaplexMasonry = ({
  className,
  ...props
}: Omit<
  MasonryProps & HTMLProps<HTMLElement>,
  'ref' | 'className' | 'columnClassName'
> & { className?: string }) => (
  <Masonry
    className={className ? `${CLASS_NAME} ${className}` : CLASS_NAME}
    columnClassName="metaplex-masonry-column"
    breakpointCols={props.breakpointCols ?? COL_BREAKPOINTS}
    {...props}
  />
);
