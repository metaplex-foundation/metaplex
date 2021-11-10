import React from 'react';
import { Space, Button, Typography } from 'antd';
import { useArt } from '../../hooks';
import { useConnectionConfig } from '@oyster/common';
import { Art } from '../../types';

type ViewOnProps = { id: string; art?: undefined } | { art: Art };
const { Text } = Typography;

export const ViewOn = (props: ViewOnProps) => {
  const { env } = useConnectionConfig();
  const art = props.art ?? useArt(props.id);

  return (
    <Space direction="vertical" size="small">
      <Text>View on</Text>
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
    </Space>
  );
};
