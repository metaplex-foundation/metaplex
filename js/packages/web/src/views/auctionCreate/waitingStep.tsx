import { Card, Row, Col, Space, Progress, Typography } from 'antd';
import React, { useEffect } from 'react';

const { Title } = Typography;

export const WaitingStep = (props: {
  createAuction: () => Promise<void>;
  percent: number;
  rejection?: string;
}) => {
  useEffect(() => {
    const func = async () => {
      await props.createAuction();
    };
    func();
  }, []);


  let title = 'Listing NFT with Metaplex...';
  let description = 'This may take a minute or two depending current network demand.';
  let status: 'normal' | 'exception' = 'normal';

  if (props.rejection) {
    title = 'Issue Listing with Metaplex!';
    description = props.rejection;
    status = 'exception';
  }

  return (
    <Row justify="center">
      <Col xs={22} md={16} lg={12}>
        <Card
        >
            <Space direction="vertical" size="large" className="metaplex-fullwidth">
          <Row justify="center">
            <Progress
              status={status}
              type="circle"
              width={140}
              percent={props.percent}
            />
          </Row>
          <Card.Meta
            title={
              <Title level={5}>
                {title}
              </Title>
            }
            description={description}
          />
          </Space>
        </Card>
      </Col>
    </Row>
  );
};
