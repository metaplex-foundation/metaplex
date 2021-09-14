import { Form, Input, Button } from 'antd';
import {useWallet} from '@solana/wallet-adapter-react';
import {useHistory} from "react-router-dom";

export const SignUpForm = () => {
  const wallet = useWallet();
  const history = useHistory();
  const onFinish = (values: any) => {
    // @ts-ignore
    values.wallet = wallet.publicKey.toString();
    console.log('Success:', values);
    let token = "sadwaas"
    sessionStorage.setItem('token', token);
    history.push('/')
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
  };

  return (
    <Form
      name="basic"
      initialValues={{ remember: true }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      autoComplete="off"
      style={{width: '650px', margin: '0 auto' }}
    >
      <Form.Item
        label="Username"
        name="username"
        rules={[{ required: true, message: 'Please input your username!' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="Password"
        name="password"
        rules={[{ required: true, message: 'Please input your password!' }]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item wrapperCol={{ offset: 12, span: 16 }}>
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
};
