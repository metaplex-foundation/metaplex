import React from 'react';
import { Button, Typography, List, Avatar, Space, Switch, Row, Col, Divider } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

import PackItem from './packItem';

const { Text } = Typography;

const list = [
  {
    name: 'Pack1',
    card: 'CardName1',
  },
  {
    name: 'Pack2',
    card: 'CardName2',
    voucher: 'VoucherName2'
  },
  {
    name: 'Pack3',
    voucher: 'VoucherName3'
  },
];

const PacksList = () => {
  const onDeleteVoucher = (id: string) => {
    console.log('onDeleteVoucher:', id);
  };

  const onDeleteCard = (id: string) => {
    console.log('onDeleteCard:', id);
  };

  const listData = list.map((pack, i) => ({
    href: 'https://ant.design',
    title: pack.name,
    id: pack.name,
    cardId: pack.card,
    voucherId: pack.voucher,
    activate: false,
    avatar: 'https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png',
    description:
      'Ant Design, a design language for background applications, is refined by Ant UED Team.',
    content: () => (
      <>
        <Divider />
        {
          pack.voucher && (
            <Row style={{ marginBottom: 20 }}>
              <Col flex="150px" style={{
                display: "flex",
                alignItems: 'center',
              }}>
                <Text>Delete voucher:</Text>
              </Col>
              <Col flex="auto" style={{
                display: "flex",
                alignItems: 'center',
              }}>
                <Text>{pack.voucher}</Text>
              </Col>
              <Col flex="40px">
                <Button
                  onClick={() => onDeleteVoucher(pack.voucher)}
                  size="small"
                  style={{ height: 32 }}
                  danger
                >
                  <DeleteOutlined />
                </Button>
              </Col>
            </Row>
          )
        }
        {
          pack.card && (
            <Row>
              <Col flex="150px" style={{
                display: "flex",
                alignItems: 'center',
              }}>
                <Text>Delete card:</Text>
              </Col>
              <Col flex="auto" style={{
                display: "flex",
                alignItems: 'center',
              }}>
                <Text>{pack.card}</Text>
              </Col>
              <Col flex="40px">
                <Button
                  onClick={() => onDeleteCard(pack.card)}
                  size="small"
                  style={{ height: 32 }}
                  danger
                >
                  <DeleteOutlined />
                </Button>
              </Col>
            </Row>
          )
        }
        <Divider />
      </>
    )
  }));

  return (
    <div className="pack-list-wrapper">
      <List
        itemLayout="vertical"
        size="large"
        pagination={{
          onChange: page => {
            console.log(page);
          },
          pageSize: 3,
        }}
        dataSource={listData}
        renderItem={item => (
          <PackItem pack={item} />
        )}
      />
    </div>
  );
}

export default PacksList;
