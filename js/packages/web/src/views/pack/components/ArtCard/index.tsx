import React from 'react';
import { useExtendedArt } from '../../../../hooks';
import { Link } from 'react-router-dom';
import { usePack } from '../../contexts/PackContext';
import SmallLoader from '../../../../components/SmallLoader';

const ArtCard = ({ index }: { index: number }) => {
  const { openedMetadata, provingProcess } = usePack();
  const cardsRedeemed = provingProcess?.info.cardsRedeemed || 0;

  const isOpenedCard = index < cardsRedeemed;
  const metadata = openedMetadata[index];
  const pubkey = (isOpenedCard && metadata?.metadata.pubkey) || '';

  const { ref, data } = useExtendedArt(pubkey);

  const style = {
    backgroundImage: `url(${data?.image})`,
  };

  const shouldRenderImage = isOpenedCard && pubkey;

  return (
    <div className="pack-card" ref={ref}>
      {shouldRenderImage && (
        <Link to={`/art/${pubkey}`}>
          <div className="pack-card__image" style={style}></div>
        </Link>
      )}
      {!shouldRenderImage && (
        <div className="pack-card__square">
          <div className="pack-card__square__front">
            {isOpenedCard && <SmallLoader />}
            {!isOpenedCard && <span>{index + 1}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtCard;
