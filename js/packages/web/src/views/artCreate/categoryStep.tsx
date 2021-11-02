import { MetadataCategory } from '@oyster/common';
import { Button, Col, Row } from 'antd';
import React from 'react';
import useWindowDimensions from '../../utils/layout';

export const CategoryStep = (props: {
  confirm: (category: MetadataCategory) => void;
}) => {
  const { width } = useWindowDimensions();
  return (
    <>
      <Row>
        <h2>Create a new item</h2>
        <p>
          First time creating on Metaplex?{' '}
          <a href="#">Read our creators’ guide.</a>
        </p>
      </Row>
      <Row justify={width < 768 ? 'center' : 'start'}>
        <Col>
          <Row>
            <Button
              size="large"
              onClick={() => props.confirm(MetadataCategory.Image)}
            >
              <div>
                <div>Image</div>
                <div>JPG, PNG, GIF</div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              size="large"
              onClick={() => props.confirm(MetadataCategory.Video)}
            >
              <div>
                <div>Video</div>
                <div>MP4, MOV</div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              size="large"
              onClick={() => props.confirm(MetadataCategory.Audio)}
            >
              <div>
                <div>Audio</div>
                <div>MP3, WAV, FLAC</div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              size="large"
              onClick={() => props.confirm(MetadataCategory.VR)}
            >
              <div>
                <div>AR/3D</div>
                <div>GLB</div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              size="large"
              onClick={() => props.confirm(MetadataCategory.HTML)}
            >
              <div>
                <div>HTML Asset</div>
                <div>HTML</div>
              </div>
            </Button>
          </Row>
        </Col>
      </Row>
    </>
  );
};
