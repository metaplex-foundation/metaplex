import { LoadingOutlined } from '@ant-design/icons';
import { IMetadataExtension, MAX_METADATA_LEN } from '@oyster/common';
import { MintLayout } from '@solana/spl-token';
import { Connection } from '@solana/web3.js';
import { Button, Col, Row, Spin, Statistic, Space } from 'antd';
import React, { useEffect, useState } from 'react';
import { useArtworkFiles } from '.';
import { AmountLabel } from '../../components/AmountLabel';
import { ArtCard } from '../../components/ArtCard';
import { getAssetCostToStore, LAMPORT_MULTIPLIER } from '../../utils/assets';

export const LaunchStep = (props: {
  confirm: () => void;
  attributes: IMetadataExtension;
  files: File[];
  connection: Connection;
}) => {
  const [cost, setCost] = useState(0);
  const { image, animation_url } = useArtworkFiles(
    props.files,
    props.attributes,
  );
  const files = props.files;
  const metadata = props.attributes;
  useEffect(() => {
    const rentCall = Promise.all([
      props.connection.getMinimumBalanceForRentExemption(MintLayout.span),
      props.connection.getMinimumBalanceForRentExemption(MAX_METADATA_LEN),
    ]);
    if (files.length)
      getAssetCostToStore([
        ...files,
        new File([JSON.stringify(metadata)], 'metadata.json'),
      ]).then(async lamports => {
        const sol = lamports / LAMPORT_MULTIPLIER;

        // TODO: cache this and batch in one call
        const [mintRent, metadataRent] = await rentCall;

        // const uriStr = 'x';
        // let uriBuilder = '';
        // for (let i = 0; i < MAX_URI_LENGTH; i++) {
        //   uriBuilder += uriStr;
        // }

        const additionalSol = (metadataRent + mintRent) / LAMPORT_MULTIPLIER;

        // TODO: add fees based on number of transactions and signers
        setCost(sol + additionalSol);
      });
  }, [files, metadata, setCost]);

  return (
    <Space className="metaplex-fullwidth" direction="vertical">
      <h2>Launch your creation</h2>
      <p>
        Provide detailed description of your creative process to engage with
        your audience.
      </p>
      <Row justify="space-around">
        <Col span={6}>
          {props.attributes.image && (
            <ArtCard
              image={image}
              animationURL={animation_url}
              category={props.attributes.properties?.category}
              name={props.attributes.name}
              symbol={props.attributes.symbol}
              small={true}
            />
          )}
        </Col>
        <Col span={8}>
          <Statistic
            title="Royalty Percentage"
            value={props.attributes.seller_fee_basis_points / 100}
            precision={2}
            suffix="%"
          />
          {cost ? (
            <AmountLabel title="Cost to Create" amount={cost} />
          ) : (
            <Spin indicator={<LoadingOutlined />} />
          )}
        </Col>
      </Row>

      <Button
        className="metaplex-fullwidth"
        type="primary"
        size="large"
        onClick={props.confirm}
      >
        Pay with SOL
      </Button>
    </Space>
  );
};
