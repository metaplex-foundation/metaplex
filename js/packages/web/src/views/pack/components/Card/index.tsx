import classNames from 'classnames';
import React from 'react';

const Card = ({
  value,
  onClick,
  isHoverable,
}: {
  value: number;
  isHoverable?: boolean;
  onClick: () => void;
}) => {
  const cardCls = classNames({
    'pack-view__block': true,
    'pack-view__block--hoverable': isHoverable,
  });

  return (
    <div className={cardCls} onClick={onClick}>
      <div className="pack-view__square">
        <div className="pack-view__square__front">
          <span>{value + 1}</span>
        </div>
        <div className="pack-view__square__back">
          <span>Open</span>
        </div>
      </div>
    </div>
  );
};

export default Card;
