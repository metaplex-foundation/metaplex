import React from 'react';
import { useExtendedArt } from '../../../../hooks';
import { Link } from 'react-router-dom';

const ArtCard = ({ pubkey }: { pubkey: string }) => {
  const { ref, data } = useExtendedArt(pubkey);

  const style = {
    backgroundImage: `url(${data?.image})`,
  };

  return (
    <div className="pack-view__block" ref={ref}>
      <Link to={`/art/${pubkey}`}>
        <div className="pack-view__image" style={style}></div>
      </Link>
    </div>
  );
};

export default ArtCard;
