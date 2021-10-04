import React from 'react';
import { Button, Typography, List, Avatar, Space, Switch, Row, Col, Divider } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

const { Text } = Typography;

const list = [
  {
    name: 'Pack1',
    card: '1111',
  },
  {
    name: 'Pack2',
    card: '1111',
    voucher: '1111'
  },
  {
    name: 'Pack3',
    voucher: '1111'
  },
];

function PacksList() {
  const onDelete = (id: string) => {
      console.log('onDelete:', id);
  };
  const onActivate = (checked: boolean, id: string) => {
      console.log('onActivate:', checked, id);
  };

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
              <Col flex={4}>
                <Button
                  onClick={() => onDeleteVoucher(pack.voucher)}
                  size="small"
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
              <Col flex={4}>
                <Button
                  onClick={() => onDeleteCard(pack.card)}
                  size="small"
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
          <List.Item
            key={item.title}
            actions={[
              <Space
                style={{
                  display: "flex",
                  alignItems: 'center'
                }}
              >
                <Text>Activate pack:</Text>
                <Switch
                  defaultChecked={item.activate}
                  onClick={(checked) => onActivate(checked, item.id)}
                />
              </Space>,
              <Button
                type="primary"
                danger
                onClick={() => onDelete(item.id)}
              >
                Delete pack
              </Button>
            ]}
            style={{
              marginBottom: 30,
              paddingBottom: 40,
              borderWidth: 3,
              borderColor: "#ccc"
            }}
            extra={
              <img
                width={272}
                alt="logo"
                src="https://gw.alipayobjects.com/zos/rmsportal/mqaQswcyDLcXyDKnZfES.png"
              />
            }
          >
            <List.Item.Meta
              avatar={<Avatar src={item.avatar} />}
              title={<a href={item.href}>{item.title}</a>}
              description={item.description}
            />
            { (item.voucherId || item.cardId) && item.content()}
          </List.Item>
        )}
      />
    </div>
  );
}

export default PacksList;
