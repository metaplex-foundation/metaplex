import { Button, InputNumber, Space, Form } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import React from 'react';
import { AuctionCategory, AuctionState } from '.';

export const PriceAuction = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  type InputState = number | undefined;
  const [form] = useForm();

  const checkForPriceError = (price: InputState, tick: InputState) => {
    const multiplier = 1000;
    if (price && tick && (price * multiplier) % (tick * multiplier) !== 0) {
      throw new Error();
    }
  };

  return (
    <Space className="metaplex-fullwidth" direction="vertical">
      <div>
        <h2>Price</h2>
        <p>Set the price for your auction.</p>
      </div>

      <Form
        form={form}
        onFinish={() => {
          form.validateFields(['price', 'tickSize']).then(props.confirm);
        }}
      >
        {props.attributes.category === AuctionCategory.Open && (
          <Form.Item
            name="price"
            rules={[
              {
                message:
                  'Starting price must be an exact multiple of the tick size!',
                validator: async (_, price) => {
                  checkForPriceError(price, props.attributes.priceTick);
                },
              },
              {
                required: true,
                message: 'Price is required.',
              },
            ]}
          >
            <label>
              <h3>Price</h3>
              <p>
                This is the fixed price that everybody will pay for your
                Participation NFT.
              </p>
              <div className="metaplex-flex metaplex-align-items-center metaplex-gap-2">
                ◎
                <InputNumber<number>
                  min={0}
                  decimalSeparator="."
                  className="metaplex-fullwidth"
                  step="0.01"
                  autoFocus
                  placeholder="Fixed Price in SOL"
                  onChange={price => {
                    props.setAttributes({
                      ...props.attributes,
                      // Do both, since we know this is the only item being sold.
                      participationFixedPrice: price,
                      priceFloor: price,
                    });
                  }}
                  precision={2}
                />
              </div>
            </label>
          </Form.Item>
        )}
        {props.attributes.category !== AuctionCategory.Open && (
          <Form.Item
            name="price"
            rules={[
              {
                message:
                  'Starting price must be an exact multiple of the tick size!',
                validator: async (_, price) => {
                  checkForPriceError(price, props.attributes.priceTick);
                },
              },
              {
                required: true,
                message: 'Price is required.',
              },
            ]}
          >
            <label>
              <h3>Price Floor</h3>
              <p>This is the starting bid price for your auction.</p>
              <div className="metaplex-flex metaplex-align-items-center metaplex-gap-2">
                ◎
                <InputNumber<number>
                  min={0}
                  decimalSeparator="."
                  className="metaplex-fullwidth"
                  step="0.01"
                  autoFocus
                  placeholder="Price in SOL"
                  onChange={price => {
                    props.setAttributes({
                      ...props.attributes,
                      priceFloor: price,
                    });
                  }}
                  precision={2}
                />
              </div>
            </label>
          </Form.Item>
        )}
        <Form.Item
          name="tickSize"
          rules={[
            {
              message:
                'Starting price must be an exact multiple of the tick size!',
              validator: async (_, tickSize) => {
                checkForPriceError(props.attributes.priceFloor, tickSize);
              },
            },
          ]}
        >
          <label>
            <h3 className="metaplex-margin-top-4">Tick Size</h3>
            <p>All bids must fall within this price increment.</p>
            <div className="metaplex-flex metaplex-align-items-center metaplex-gap-2">
              ◎
              <InputNumber<number>
                min={0}
                decimalSeparator="."
                className="metaplex-fullwidth"
                step="0.01"
                placeholder="Tick size in SOL"
                onChange={tick => {
                  props.setAttributes({
                    ...props.attributes,
                    priceTick: tick,
                  });
                }}
                precision={2}
              />
            </div>
          </label>
        </Form.Item>
        <Form.Item>
          <Button
            className="metaplex-fullwidth metaplex-margin-y-4"
            type="primary"
            size="large"
            htmlType="submit"
          >
            Continue
          </Button>
        </Form.Item>
      </Form>
    </Space>
  );
};
