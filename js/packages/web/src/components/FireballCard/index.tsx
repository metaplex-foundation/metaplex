import React from 'react';
import { Card } from 'antd';

export interface NFT {
  name: string;
  image: string;
}


export const FireballCard = ({ nft }: { nft: NFT }) => {
  return (
    <Card
      hoverable={true}
      className={`fireball-card`}
      cover={
        <div className="header-container">
          {nft.image ? <img src={nft.image} /> : null}
        </div>
      }
      bordered={false}
    >
      <>
        <div className="fireball-card-name">
          {nft.name}
        </div>
      </>
    </Card>
  );
};
