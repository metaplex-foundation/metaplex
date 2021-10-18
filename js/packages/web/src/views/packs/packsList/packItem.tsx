import React, { useState, memo } from 'react';
import { Button, List, Divider, Space, Switch, Avatar, Typography, Form, Input } from 'antd';

const { Text, Title } = Typography;

const PackItem = ({ pack }) => {
  const [ editMode, setEditMode ] = useState(false);
  const onEdit = (id: string) => {
    setEditMode(true);
    console.log('onDelete:', id);
  };

  const onDelete = (id: string) => {
    console.log('onDelete:', id);
  };

  const onActivate = (checked: boolean, id: string) => {
    console.log('onActivate:', checked, id);
  };

  const onSubmitEditPack = (values: any) => {
    setEditMode(false);
    console.log('onSubmitEditPack:', values);
  };

  const onSubmitEditPackFailed = (values: any) => {
    console.log('onSubmitEditPackFailed:', values);
  };

  return (
    <List.Item
      key={pack.title}
      actions={[
        <Space
          style={{
            display: "flex",
            alignItems: 'center'
          }}
        >
          <Text>Activate pack:</Text>
          <Switch
            defaultChecked={pack.activate}
            onClick={(checked) => onActivate(checked, pack.id)}
          />
        </Space>,
        <Button
          type="primary"
          onClick={() => onEdit(pack.id)}
          style={{ height: 30 }}
        >
          Edit pack
        </Button>,
        <Button
          type="primary"
          onClick={() => onDelete(pack.id)}
          style={{ height: 30 }}
          danger
        >
          Reclaim items
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
        avatar={<Avatar src={pack.avatar} />}
        title={<a href={pack.href}>{pack.title}</a>}
        description={pack.description}
      />
      { (pack.voucherId || pack.cardId) && pack.content()}
      {
        editMode && (
          <>
            <Form
              name="editPack"
              labelCol={{ span: 8 }}
              wrapperCol={{ span: 16 }}
              initialValues={{ remember: true }}
              onFinish={onSubmitEditPack}
              onFinishFailed={onSubmitEditPackFailed}
              autoComplete="off"
              layout="vertical"
              style={{ paddingLeft: 30 }}
            >
              <Form.Item
                label="New Name"
                name="name"
                rules={[{ required: true, message: 'Please input new pack name' }]}
                style={{ paddingTop: 10 }}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Mutable"
                name="mutable"
                valuePropName="mutable"
              >
                <Switch />
              </Form.Item>

              <Form.Item style={{ paddingBottom: 10 }}>
                <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="small"
                  style={{ height: 40 }}
                >
                  Submit Edit pack
                </Button>
                <Button
                  onClick={() => setEditMode(false)}
                  size="small"
                  style={{ height: 40 }}
                >
                  Cancel
                </Button>
                </Space>
              </Form.Item>
            </Form>
            <Divider />
          </>
        )
      }
    </List.Item>
  )
};

export default memo(PackItem);
