import { Col, Row, Layout } from 'antd';
import React, {useState} from 'react';
import Masonry from 'react-masonry-css';
import { FireballCard } from '../../components/FireballCard';
import {data} from './data'
import {ArtworkViewState} from "../artworks";
import {useCreatorArts, useUserArts} from "../../hooks";
import {useMeta} from "@oyster/common";
import {useWallet} from "@solana/wallet-adapter-react";

const { Content } = Layout;

export const FireballView = () => {
  const { publicKey } = useWallet();
  const ownedMetadata = useUserArts();
  const createdMetadata = useCreatorArts(publicKey?.toBase58() || '');
  const { metadata } = useMeta();
  const [activeKey] = useState(ArtworkViewState.Owned);

  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };

  const items =
    activeKey === ArtworkViewState.Owned
      ? ownedMetadata.map(m => m.metadata)
      : activeKey === ArtworkViewState.Created
      ? createdMetadata
      : metadata;


  const cardGrid = (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid fireball-masonry"
      columnClassName="my-masonry-grid_column"
    >
      {items.map((m, id) => {
        return (
          <FireballCard
            key={id}
              pubkey={m.pubkey}
              preview={false}
              height={250}
              width={250}
              artView
          />
        );
      })}
    </Masonry>
  );

  return (
    <Layout style={{ margin: 0, marginTop: 30}}>
      <p>You`re a Collectoooooor</p>
      <p>You can burn 13 NFTs to unlock an exclusive Collector NFT. You need more.</p>
      <Row className={"mintContainer"}>
        <Col lg={8} sm={24}>
          <div className={"nftContainer"}>
            <img className={"imgNft"} src="" alt="" height={350} width={350}/>
            <button className={"mintBtn"}>Mint</button>
          </div>
        </Col>
        <Col lg={8} sm={24}>
          <div className={"nftContainer"}>
            <img className={"imgNft"} src="" alt="" height={350} width={350}/>
            <button className={"mintBtn"}>Mint</button>
          </div>
        </Col>
        <Col lg={8} sm={24}>
          <div className={"nftContainer"}>
            <img className={"imgNft"} src="" alt="" height={350} width={350}/>
            <button className={"mintBtn"}>Mint</button>
          </div>
        </Col>
      </Row>
      <div className={"row"}>
        <p className={"textTitle"}>Your NFTs</p>
        <div className={"unlock-nft"}> <p className={"unlock-text"}>3/13 NFTs unlocked</p></div>
      </div>
      <p>The NFTs you have collected so far.</p>
      <br/>
      <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
        <Col style={{ width: '100%', marginTop: 10}}>{cardGrid}</Col>
      </Content>
    </Layout>
  );
};
