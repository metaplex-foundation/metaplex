import React from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Button } from 'antd';
import {
  useArt,
  useAuction,
} from '../../hooks';
import {
  useConnectionConfig,
} from '@oyster/common';

export const ViewOn = () => {
  const { id } = useParams<{ id: string }>();
  const { env } = useConnectionConfig();
  const auction = useAuction(id);
  const art = useArt(auction?.thumbnail.metadata.pubkey);

  return (
    <>
      <Col>
        <h6>View on</h6>
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
