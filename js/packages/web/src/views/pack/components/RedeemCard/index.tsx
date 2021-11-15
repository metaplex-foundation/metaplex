import React  from 'react';

interface IPropsRedeemCard {
  card: IRedeemCard;
}

interface IRedeemCard {
  name: string;
  desc: string;
  percentage: number;
  src: string;
}

const RedeemCard = ({ card: { name, desc, src, percentage } }: IPropsRedeemCard) => (
  <div className="modal-redeem__card">
    <div className="info">
      <div className="modal-redeem__image">
        <img src={src} alt={name}/>
      </div>
      <div className="info__text">
        <p className="info__title">{name}</p>
        <p>{desc}</p>
      </div>
    </div>
    <div className="modal-redeem__percentage">
      <p>{`${percentage}% chance`}</p>
    </div>
  </div>
)

export default RedeemCard;
