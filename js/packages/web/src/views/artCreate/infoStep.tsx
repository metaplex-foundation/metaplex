import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { IMetadataExtension } from '@oyster/common';
import { Button, Col, Form, Input, InputNumber, Row, Space } from 'antd';
import React from 'react';
import { useArtworkFiles } from '.';
import { ArtCard } from '../../components/ArtCard';

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

  return (
    <Space className="metaplex-fullwidth" direction="vertical">
      <>
        <h2>Describe your item</h2>
        <p>
          Provide detailed description of your creative process to engage with
          your audience.
        </p>
      </>

      <Row justify="space-between" align="middle" wrap={false}>
        <Col span={6}>
          {props.attributes.image && (
            <ArtCard
              image={image}
              animationURL={animation_url}
              category={props.attributes.properties?.category}
              name={props.attributes.name}
              symbol={props.attributes.symbol}
              small={true}
            />
          )}
        </Col>
        <Col span={16}>
          <Space className="metaplex-fullwidth" direction="vertical">
            <label>
              <h3>Title</h3>
              <Input
                autoFocus
                placeholder="Max 50 characters"
                allowClear
                value={props.attributes.name}
                onChange={info =>
                  props.setAttributes({
                    ...props.attributes,
                    name: info.target.value,
                  })
                }
              />
            </label>
            {/* <label>
            <span>Symbol</span>
            <Input
             
              placeholder="Max 10 characters"
              allowClear
              value={props.attributes.symbol}
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  symbol: info.target.value,
                })
              }
            />
          </label> */}

            <label>
              <h3>Description</h3>
              <Input.TextArea
                size="large"
                placeholder="Max 500 characters"
                value={props.attributes.description}
                onChange={info =>
                  props.setAttributes({
                    ...props.attributes,
                    description: info.target.value,
                  })
                }
                allowClear
              />
            </label>

            <label>
              <h3>Maximum Supply</h3>
              <InputNumber
                className="metaplex-fullwidth"
                placeholder="Quantity"
                onChange={(val: number) => {
                  props.setAttributes({
                    ...props.attributes,
                    properties: {
                      ...props.attributes.properties,
                      maxSupply: val,
                    },
                  });
                }}
              />
            </label>
            <label>
              <h3>Attributes</h3>
            </label>
            <Form name="dynamic_attributes" form={form} autoComplete="off">
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
            </Form>
          </Space>
        </Col>
      </Row>

      <Button
        className="metaplex-fullwidth"
        type="primary"
        size="large"
        onClick={() => {
          form.validateFields().then(values => {
            const nftAttributes = values.attributes;
            // value is number if possible
            for (const nftAttribute of nftAttributes || []) {
              const newValue = Number(nftAttribute.value);
              if (!isNaN(newValue)) {
                nftAttribute.value = newValue;
              }
            }
            console.log('Adding NFT attributes:', nftAttributes);
            props.setAttributes({
              ...props.attributes,
              attributes: nftAttributes,
            });

            props.confirm();
          });
        }}
      >
        Continue to royalties
      </Button>
    </Space>
  );
};
