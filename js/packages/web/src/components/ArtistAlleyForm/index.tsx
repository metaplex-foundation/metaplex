import React from 'react';
import { Form, Input, Button, Upload } from 'antd';

export const ArtistAlleyForm = () => {
  const { TextArea } = Input;

  const onFinish = () => {};

  const handleFile = (e: any) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e && e.fileList;
  };

  return (
    <div>
      <div> Submit your original artwork to be featured by Todd MacFarlane</div>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Your Name">
          <Input placeholder="Enter your name" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Your Email Address"
          rules={[
            {
              type: 'email',
              message: 'This is not a valid email',
            },
          ]}
        >
          <Input placeholder="name@email.com" />
        </Form.Item>

        <Form.Item name="url" label="Link to your portfolio">
          <Input placeholder="Enter a link to your portfolio" />
        </Form.Item>

        <Form.Item label="Upload artwork (optional)">
          <Form.Item
            name="dragger"
            valuePropName="fileList"
            getValueFromEvent={handleFile}
          >
            <Upload.Dragger name="files" action="/upload.do">
              <p>Upload files here</p>
              <p>Drag and drop, or click to browse</p>
            </Upload.Dragger>
          </Form.Item>
        </Form.Item>

        <Form.Item
          name="message"
          label="Anything else to add?"
          rules={[
            {
              pattern: /^[a-zA-Z_0-9]{0,50}$/,
              message: 'Max 500 characters',
            },
          ]}
        >
          <TextArea rows={4} placeholder="Max 500 characters" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">
            SUBMIT
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};
