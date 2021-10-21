import React, { HTMLProps } from 'react';
import Masonry, { MasonryProps } from 'react-masonry-css';

const COL_BREAKPOINTS = {
  // [ <width> | 'default' ]: <num-cols>
  default: 4,
  1100: 3,
  700: 2,
  500: 1,
};

export const MetaplexMasonry = (
  props: Omit<
    MasonryProps & HTMLProps<HTMLElement>,
    'ref' | 'className' | 'columnClassName'
  >,
) => (
  <Masonry
    className="metaplex-masonry"
    columnClassName="metaplex-masonry-column"
    breakpointCols={props.breakpointCols ?? COL_BREAKPOINTS}
    {...props}
  />
);
