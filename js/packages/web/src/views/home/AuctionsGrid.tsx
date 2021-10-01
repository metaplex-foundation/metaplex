import { FC } from 'react';
import Masonry from 'react-masonry-css';
import { Link } from 'react-router-dom';
import { AuctionRenderCard } from '../../components/AuctionRenderCard';
import { CardLoader } from '../../components/MyLoader';

const breakpointColumnsObj = {
  default: 4,
  1100: 3,
  700: 2,
  500: 1,
};

type AuctionsGridProps = {
  items?: any[] | null;
  heroPubkey?: any;
  isLoading?: boolean;
};
export const AuctionsGrid: FC<AuctionsGridProps> = ({
  items = [],
  isLoading = false,
  heroPubkey,
}) => {
  return (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {!isLoading
        ? items?.map(auction => {
            if (auction.pubkey === heroPubkey) {
              return;
            }

            return (
              <Link to={`/auction/${auction.pubkey}`} key={auction.pubkey}>
                <AuctionRenderCard auction={auction} />
              </Link>
            );
          })
        : [...Array(10)].map((_, idx) => <CardLoader key={idx} />)}
    </Masonry>
  );
};
