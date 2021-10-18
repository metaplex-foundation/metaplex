import React from 'react';
import { Col, Button } from 'antd';
import { useArt } from '../../hooks';
import { useConnectionConfig } from '@oyster/common';

export const ViewOn = ({ id }: { id: string }) => {
  const { env } = useConnectionConfig();
  const art = useArt(id);

  return (
    <>
      <Col>
        <h6>View on</h6>
        <div>
          <Button onClick={() => window.open(art.uri || '', '_blank')}>
            Arweave
          </Button>
          <Button
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
