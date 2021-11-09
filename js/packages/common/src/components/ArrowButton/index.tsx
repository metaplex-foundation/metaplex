import RightOutlined from '@ant-design/icons/lib/icons/RightOutlined';
import { Button, ButtonProps, Col, Row } from 'antd';
import React from 'react';

export const ArrowButton = ({ children, ...props }: ButtonProps) => {
  return (
    <Button {...props}>
      <Row>
        {children && <Col flex="0 0 auto">{children}</Col>}
        <Col flex="1 0 auto">&#x2002;</Col>
        <Col flex="0 0 auto">
          <RightOutlined />
        </Col>
      </Row>
    </Button>
  );
};
