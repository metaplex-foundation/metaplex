import React, { memo, ReactElement } from 'react';
import { Form, Input } from 'antd';

import { DesignAndInfoStepProps } from './interface';
import { InfoFormState } from '../../interface';

const { TextArea } = Input;

const DesignAndInfoStep = ({
  setPackState,
  form,
}: DesignAndInfoStepProps): ReactElement => {
  const onValuesChange = (changedValues: Partial<InfoFormState>) => {
    setPackState(changedValues);
  };

  return (
    <div className="design-step-wrapper">
      <Form
        className="form-wrapper"
        name="designPack"
        initialValues={{ remember: true }}
        onValuesChange={onValuesChange}
        form={form}
        autoComplete="off"
        layout="vertical"
      >
        <p className="form-wrapper__label">
          Absolute url to cover image (Required)
        </p>
        <p className="form-wrapper__sublabel">
          We recomend an image of at least 900x400.
        </p>
        <Form.Item
          name="uri"
          rules={[{ required: true, message: 'Please enter Cover URL' }]}
        >
          <Input placeholder="http://example.io" />
        </Form.Item>

        <p className="form-wrapper__label">Title (Required)</p>
        <Form.Item
          name="name"
          rules={[{ required: true, message: 'Please enter pack title' }]}
        >
          <Input placeholder="Item name" />
        </Form.Item>

        <p className="form-wrapper__label">Description (Required)</p>
        <Form.Item
          name="description"
          rules={[{ required: true, message: 'Please enter Description' }]}
        >
          <TextArea placeholder="Item description" />
        </Form.Item>
      </Form>
    </div>
  );
};

export default memo(DesignAndInfoStep);
