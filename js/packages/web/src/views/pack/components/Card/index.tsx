import React from 'react';

const Card = ({
  value,
}: {
  value: number;
}) => {

  return (
    <div className="pack-view__block">
      <div className="pack-view__square">
        <div className="pack-view__square__front">
          <span>{value + 1}</span>
        </div>
      </div>
    </div>
  );
};

export default Card;
