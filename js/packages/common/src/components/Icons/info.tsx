import { Button, Popover } from 'antd';
import React from 'react';

import { InfoCircleOutlined } from '@ant-design/icons';

export const Info = (props: { text: React.ReactElement }) => {
  return (
    <Popover trigger="hover" content={<div>{props.text}</div>}>
      <Button type="text" shape="circle">
        <InfoCircleOutlined />
      </Button>
    </Popover>
  );
};
