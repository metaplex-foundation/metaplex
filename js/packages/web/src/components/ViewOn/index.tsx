import React from 'react';
import { Col, Button, Typography } from 'antd';
import {
  useArt,
} from '../../hooks';
import {
  useConnectionConfig,
} from '@oyster/common';
const {Title} = Typography;

export const ViewOn = ({ id }: { id: string }) => {
  const { env } = useConnectionConfig();
  const art = useArt(id);

  return (
    <>
      <Col className="view-on">
        <Title level={5} style={{color: 'black', textAlign: 'center'}}>View on</Title>
        <div style={{ display: 'flex' }}>
          <Button
            className="tag"
            onClick={() => window.open(art.uri || '', '_blank')}
          >
            Arweave
          </Button>
          <Button
            className="tag"
            onClick={() =>
              window.open(
                `https://explorer.solana.com/account/${art?.mint || ''}${
                  env.indexOf('main') >= 0 ? '' : `?cluster=${env}`
                }`,
                '_blank',
              )
            }
          >
            Solana
          </Button>
        </div>
      </Col>
    </>
  );
};
