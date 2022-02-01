import { MetadataCategory } from '@oyster/common';
import { Button, Row, Col, Space } from 'antd';
import React from 'react';

export const CategoryStep = (props: {
  confirm: (category: MetadataCategory) => void;
}) => {
  return (
    <Space className="metaplex-fullwidth" direction="vertical">
      <h2>Create a new item</h2>
      <Row>
        <Col span={10}>
          <Space className="metaplex-fullwidth" direction="vertical">
            {[
              {
                cat: MetadataCategory.Image,
                title: 'Image',
                types: ['JPG', 'PNG', 'GIF'],
              },
              {
                cat: MetadataCategory.Video,
                title: 'Video',
                types: ['MP4', 'MOV'],
              },
              {
                cat: MetadataCategory.Audio,
                title: 'Audio',
                types: ['MP3', 'WAV', 'FLAC'],
              },
              {
                cat: MetadataCategory.VR,
                title: 'AR/3D',
                types: ['GLB'],
              },
              {
                cat: MetadataCategory.HTML,
                title: 'HTML Asset',
                types: ['HTML'],
              },
            ].map(({ cat, title, types }) => (
              <Button
                key={cat}
                className="metaplex-button-jumbo metaplex-fullwidth"
                type="ghost"
                size="large"
                onClick={() => props.confirm(cat)}
              >
                <div>{title}</div>
                <div>{types.join(', ')}</div>
              </Button>
            ))}
          </Space>
        </Col>
      </Row>
    </Space>
  );
};
