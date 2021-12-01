import React from 'react';
import {Card} from 'antd';
import {useArt} from "../../hooks";
import {ArtType} from "../../types";
import {ArtCardProps} from "../ArtCard";
import {ArtContent} from "../ArtContent";

export interface NFT {
  name: string;
  image: string;
}

export const FireballCard = (props: ArtCardProps) => {
  let {
    className,
    small,
    category,
    image,
    animationURL,
    name,
    preview,
    pubkey,
    height,
    artView,
    width,
    ...rest
  } = props;
  const art = useArt(pubkey);
  name = art?.title || name || ' ';

  let badge = '';
  if (art.type === ArtType.NFT) {
    badge = 'Unique';
  } else if (art.type === ArtType.Master) {
    badge = 'NFT 0';
  } else if (art.type === ArtType.Print) {
    badge = `${art.edition}/${art.supply}`;
  }

  return (
    <Card
      hoverable={true}
      className={`fireball-card ${small ? 'small' : ''} ${className ?? ''}`}
      cover={
        <div className="image-container">
          <ArtContent
            pubkey={pubkey}
            uri={image}
            animationURL={animationURL}
            category={category}
            preview={preview}
            height={height}
            width={width}
            artView={artView}
            style={{border: "15px"}}
          />
        </div>
      }
      bordered={false}
     {...rest}
    >
      <div>
        <p className={"card-title"}>PPLPLEASER</p>
        <p className={"card-name"}>#{name}</p>
        <div className={"label-quantity"}>
          {badge}
        </div>
      </div>
    </Card>
  );
};
