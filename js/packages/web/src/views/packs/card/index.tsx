import React from 'react';
import { Form, Input, Button, Select } from 'antd';

const valueU32 = 4294967295;
const { Option } = Select;

function AddCard() {
    const onSubmit = (values: any) => {
        console.log('Success:', values);
    };

    const onSubmitFailed = (errorInfo: any) => {
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
                onFinishFailed={onSubmitFailed}
                autoComplete="off"
                layout="vertical"
            >
                <Form.Item
                    label="Token"
                    name="token"
                    rules={[{ required: true, message: 'Please input token' }]}
                    style={{ paddingTop: 30 }}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Number to open"
                    name="number_to_open"
                    rules={[{ required: true, message: 'Please input number to open' }]}
                >
                    <Input type={"number"} maxLength={valueU32} />
                </Form.Item>

                {
                  false && "probability"
                }
                <Form.Item name="distribution_type" label="Distribution type" rules={[{ required: true }]}>
                  <Select
                    placeholder="Select a option and change input text above"
                    className="select"
                    onChange={onMutableChange}
                    bordered={false}
                    defaultValue="fixed"
                    disabled
                    allowClear
                  >
                    <Option value="fixed">fixed</Option>
                  </Select>
                </Form.Item>

                <Form.Item style={{ paddingTop: 30 }}>
                    <Button type="primary" htmlType="submit">
                        Add card to pack
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}

export default AddCard;
