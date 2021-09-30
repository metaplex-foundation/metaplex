import React, { FC } from 'react';
import Masonry from 'react-masonry-css';
import { Link } from 'react-router-dom';
import { ArtCard } from '../../components/ArtCard/next';
import { CardLoader } from '../../components/MyLoader';
import { Artwork } from '../../graphql';

const breakpointColumnsObj = {
  default: 4,
  1100: 3,
  700: 2,
  500: 1,
};

interface ArtworksGridProps {
  items?: Artwork[];
  isLoading?: boolean;
}

export const ArtworkGrid: FC<ArtworksGridProps> = ({
  items,
  isLoading = false,
}) => {
  return (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {!isLoading
        ? items?.map(art => {
            return (
              <Link to={`/art/${art.pubkey}`} key={art.pubkey}>
                <ArtCard art={art} preview={false} />
              </Link>
            );
          })
        : [...Array(10)].map((_, idx) => <CardLoader key={idx} />)}
    </Masonry>
  );
};
