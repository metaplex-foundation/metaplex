import React from 'react';
import { Link } from 'react-router-dom';
import { ArtistCard } from '../../components/ArtistCard';
import { MetaplexMasonry } from '../../components/MetaplexMasonry';
import { useMeta } from '../../contexts';

export const ArtistsView = () => {
  const { whitelistedCreatorsByCreator } = useMeta();

  const items = Object.values(whitelistedCreatorsByCreator);

  return (
    <MetaplexMasonry>
      {items.map((m, idx) => {
        const id = m.info.address;
        return (
          <Link to={`/artists/${id}`} key={idx}>
            <ArtistCard
              key={id}
              artist={{
                address: m.info.address,
                name: m.info.name || '',
                image: m.info.image || '',
                link: m.info.twitter || '',
                // TODO: what should the about field be?
                // about: m.info.description || '',
                background: m.info.background || '',
              }}
            />
          </Link>
        );
      })}
    </MetaplexMasonry>
  );
};
