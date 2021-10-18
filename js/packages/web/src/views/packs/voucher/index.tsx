import React from 'react';
import { Form, Input, Button } from 'antd';

const valueU32 = 4294967295;

function AddVoucher() {
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
                name="addVoucher"
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

                <Form.Item style={{ paddingTop: 30 }}>
                    <Button type="primary" htmlType="submit">
                        Add voucher to pack
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
}

export default AddVoucher;
