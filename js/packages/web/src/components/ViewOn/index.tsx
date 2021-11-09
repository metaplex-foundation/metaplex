import React from 'react';
import { Space, Button } from 'antd';
import { useArt } from '../../hooks';
import { useConnectionConfig } from '@oyster/common';
import { Art } from '../../types';

type ViewOnProps = { id: string; art?: undefined } | { art: Art };

export const ViewOn = (props: ViewOnProps) => {
  const { env } = useConnectionConfig();
  const art = props.art ?? useArt(props.id);

  return (
    <div>
      <h6>View on</h6>
      <Space direction="horizontal">
        <Button onClick={() => window.open(art.uri || '', '_blank')}>
          Metadata
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
          Transaction
        </Button>
      </Space>
    </div>
  );
};
