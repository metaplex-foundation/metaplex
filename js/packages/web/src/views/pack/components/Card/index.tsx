import React from 'react';

const Card = ({ value }: { value: number }) => (
  <div key={value} className="pack-view__block">
    <div className="pack-view__square">
      <span>{value + 1}</span>
    </div>
  </div>
);

export default Card;
