import React from 'react';
import { Form, Input, Button, Select, Switch, DatePicker } from 'antd';

const { Option } = Select;

const valueU32 = 4294967295;

function CreatePack() {
    const onSubmit = (values: any) => {
        // InitPack
        console.log('Success:', values);
    };

    const onFinishFailed = (errorInfo: any) => {
        console.log('Failed:', errorInfo);
    };

    const onMutableChange = (value: any) => {
        console.log('onMutableChange:', value);
    };

    return (
        <div className="form-box">
            <Form
                name="basic"
                labelCol={{ span: 8 }}
                wrapperCol={{ span: 16 }}
                initialValues={{ remember: true }}
                onFinish={onSubmit}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
                layout="vertical"
            >
                <Form.Item
                    label="Name"
                    name="name"
                    rules={[{ required: true, message: 'Please input pack name' }]}
                    style={{ paddingTop: 30 }}
                >
                    <Input />
                </Form.Item>

                <Form.Item name="distribution_type" label="Distribution type" rules={[{ required: true }]}>
                  <Select
                    className="select"
                    placeholder="Select a option and change input text above"
                    onChange={onMutableChange}
                    bordered={false}
                    allowClear
                  >
                    <Option value="max_supply">max_supply</Option>
                    <Option value="fixed">fixed</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label="Allowed amount to redeem"
                  name="allowed_amount_to_redeem"
                  rules={[{ required: true, message: 'Please input allowed amount to redeem!' }]}
                >
                  <Input type={"number"} maxLength={valueU32} />
                </Form.Item>

                <Form.Item
                  label="Redeem start date"
                  name="redeem_start_date"

                >
                    <DatePicker className="date-picker" style={{ width: '100%' }}/>
                </Form.Item>
                <Form.Item
                  label="Redeem end date"
                  name="redeem_end_date"
                >
                    <DatePicker className="date-picker" style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                  label="Mutable"
                  valuePropName="mutable"
                >
                  <Switch />
                </Form.Item>

                <Form.Item style={{ paddingTop: 30 }}>
                    <Button type="primary" htmlType="submit">
                        Create Pack
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}

export default CreatePack;
