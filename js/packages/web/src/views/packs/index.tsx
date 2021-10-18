import React, { memo } from 'react';
import { Layout, Button, Row, Col, Typography } from 'antd';
import { useHistory } from 'react-router-dom';

import PacksList from './packsList';

const { Content } = Layout;

const AdminPacksView = () => {
  const history = useHistory();

  return (
    <Content>
      <Row style={{ marginBottom: 30 }}>
        <Col span={8}>
          <Typography.Title
            level={3}
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '100%',
            }}
          >
            List of Packs
          </Typography.Title>
        </Col>

        <Col
          span={4}
          offset={12}
          style={{ display: 'flex', justifyContent: 'end' }}
        >
          <Button onClick={() => history.push(`/admin/pack/create/0`)}>
            Create Pack
          </Button>
        </Col>
      </Row>

      <PacksList />
    </Content>
  );
};

export default memo(AdminPacksView);
