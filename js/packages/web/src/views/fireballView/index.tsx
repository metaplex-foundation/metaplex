import { Col, Row, Layout } from 'antd';
import React from 'react';
import Masonry from 'react-masonry-css';
import { FireballCard } from '../../components/FireballCard';
import {data} from './data'

const { Content } = Layout;

export const FireballView = () => {

  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };


  const cardGrid = (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid fireball-masonry"
      columnClassName="my-masonry-grid_column"
    >
      {data.map((m, idx) => {
        return (
          <FireballCard
            key={idx}
            nft={{
              name: m.name || '',
              image: m.image || '',
            }}
          />
        );
      })}
    </Masonry>
  );

  return (
    <Layout style={{ margin: 0, marginTop: 30}}>
      <p>You`re a Collectoooooor</p>
      <p>Choose an NFT to redeem. This will burn all 13 of your current NFTs</p>
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
      <p>Your Collected NFTs</p>
      <p>Looks like you have some duplicates. In order to mint, you need 13 individual items, with no duplicates. Choose only one of each item.</p>
      <br/>
      <p>12/13 Selected</p>
      <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
        <Col style={{ width: '100%', marginTop: 10}}>{cardGrid}</Col>
      </Content>
    </Layout>
  );
};
