import { Form, Input, Button} from 'antd';
import {useHistory} from "react-router-dom";
import {login} from "../../actions/lmsIntegration";
import { useState} from "react";
import {useConnectionConfig} from "@oyster/common";

export const LoginForm = () => {
  const history = useHistory();
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState(null);
  const {env} = useConnectionConfig();

  const onFinish = (values: any) => {
    setLoading(true);
    login(values, env).then(r => {
      sessionStorage.setItem('token', r);
      history.push('/');
      setLoading(false);
    }).catch(e => {
      setLoading(false);
      setError(e.message);
      console.log(error)
    })
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
  };

  return (
    <Form
      name="basic"
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      autoComplete="off"
      style={{width: '650px', margin: '0 auto' }}
    >
      <Form.ErrorList errors={[error]} />
      <Form.Item
        label="Username"
        name="login"
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
        <Button type="primary" htmlType="submit" loading={loading}>
          Login
        </Button>
      </Form.Item>
    </Form>
  );
};
