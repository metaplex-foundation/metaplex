import { Col, Layout, Row } from 'antd';
import React, { useMemo } from 'react';
import { useStore } from '@oyster/common';
import { useMeta } from '../../contexts';
import { CollectionCard } from "../../components/CollectionCard";

export const CollectionsView = () => {
  const { metadataByCollection } = useMeta();

  const collectionMints = Object.keys(metadataByCollection)

  return (
    <Layout style={{ margin: 0, marginTop: 30, alignItems: 'center' }}>
      <span className={"collections-title"}>Collections</span>
      <Row className={"collections-layout-container"} gutter={32}>
        {collectionMints.map(collection => {
          const pubkey = metadataByCollection[collection].pubkey;
          return (
            <Col key={pubkey} xs={24} sm={12}>
              <CollectionCard pubkey={pubkey} key={pubkey} />
            </Col>
          );
        })}
      </Row>
    </Layout>
  );
};
