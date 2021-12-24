import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { IMetadataExtension } from '@oyster/common';
import { Button, Col, Form, Input, InputNumber, Row, Space } from 'antd';
import React from 'react';
import { useArtworkFiles } from '.';
import { ArtCard } from '../../components/ArtCard';
import { useState } from 'react';

export const InfoStep = (props: {
  attributes: IMetadataExtension;
  files: File[];
  setAttributes: (attr: IMetadataExtension) => void;
  confirm: () => void;
}) => {
  const { image, animation_url } = useArtworkFiles(
    props.files,
    props.attributes,
  );
  const [form] = Form.useForm();

  const [values, setValues] = useState<IMetadataExtension>(props.attributes);

  return (
    <Space className="metaplex-fullwidth" direction="vertical">
      <>
        <h2>Describe your item</h2>
        <p>
          Provide detailed description of your creative process to engage with
          your audience.
        </p>
      </>

      <Form
        name="dynamic_attributes"
        form={form}
        autoComplete="off"
        onValuesChange={field => {
          setValues({ ...values, ...field });
        }}
        initialValues={props.attributes}
        onFinish={formState => {
          const nftAttributes = formState.attributes;
          // value is number if possible
          for (const nftAttribute of nftAttributes || []) {
            const newValue = Number(nftAttribute.value);
            if (!isNaN(newValue)) {
              nftAttribute.value = newValue;
            }
          }

          const results = {
            ...props.attributes,
            ...formState,
            properties: {
              ...props.attributes.properties,
              ...formState.properties,
            },
            attributes: nftAttributes,
          };

          if (results.properties.maxSupply === null) {
            results.properties.maxSupply = undefined;
          }

          props.setAttributes(results);

          props.confirm();
        }}
      >
        <Row justify="space-between" align="middle" wrap={false}>
          <Col span={6}>
            {props.attributes.image && (
              <ArtCard
                image={image}
                animationURL={animation_url}
                category={props.attributes.properties?.category}
                name={values.name}
                small={true}
              />
            )}
          </Col>
          <Col span={16}>
            <Space className="metaplex-fullwidth" direction="vertical">
              <label>
                <h3>Name</h3>

                <Form.Item
                  name="name"
                  rules={[
                    {
                      validator: async (_, info) => {
                        if (!(Buffer.from(info).length > 32)) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          'Needs to be fewer than 32 bytes',
                        );
                      },
                    },
                  ]}
                >
                  <Input
                    autoFocus
                    placeholder="Max 32 characters (maybe fewer for non-latin characters)"
                    allowClear
                  />
                </Form.Item>
              </label>

              <label>
                <h3>Description</h3>
                <Form.Item
                  name="description"
                  rules={[
                    {
                      max: 500,
                    },
                  ]}
                >
                  <Input.TextArea
                    size="large"
                    placeholder="Max 500 characters"
                    allowClear
                  />
                </Form.Item>
              </label>

              <label>
                <h3>Maximum Supply</h3>
                <Form.Item name={['properties', 'maxSupply']}>
                  <InputNumber
                    className="metaplex-fullwidth"
                    placeholder="Quantity"
                  />
                </Form.Item>
              </label>
              <label>
                <h3>Attributes</h3>
              </label>

              <Form.List name="attributes">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, fieldKey }) => (
                      <Space key={key} align="baseline">
                        <Form.Item
                          name={[name, 'trait_type']}
                          fieldKey={[fieldKey, 'trait_type']}
                          hasFeedback
                        >
                          <Input placeholder="trait_type (Optional)" />
                        </Form.Item>
                        <Form.Item
                          name={[name, 'value']}
                          fieldKey={[fieldKey, 'value']}
                          rules={[{ required: true, message: 'Missing value' }]}
                          hasFeedback
                        >
                          <Input placeholder="value" />
                        </Form.Item>
                        <Form.Item
                          name={[name, 'display_type']}
                          fieldKey={[fieldKey, 'display_type']}
                          hasFeedback
                        >
                          <Input placeholder="display_type (Optional)" />
                        </Form.Item>
                        <Button type="text" onClick={() => remove(name)}>
                          <MinusCircleOutlined />
                        </Button>
                      </Space>
                    ))}
                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        block
                        icon={<PlusOutlined />}
                      >
                        Add attribute
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Space>
          </Col>
        </Row>

        <Form.Item>
          <Button
            className="metaplex-fullwidth"
            type="primary"
            size="large"
            htmlType="submit"
          >
            Continue to royalties
          </Button>
        </Form.Item>
      </Form>
    </Space>
  );
};
