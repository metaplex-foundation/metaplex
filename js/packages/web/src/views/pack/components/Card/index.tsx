import React  from 'react';

const Card = ({ value, onOpen }) => (
  <div
    key={value}
    className="pack-view__block"
    onClick={() => onOpen(true)}
  >
    <div className="pack-view__square">
      <span>{ value === 0 ? '?' : value + 1}</span>
    </div>
  </div>
)

export default Card;
