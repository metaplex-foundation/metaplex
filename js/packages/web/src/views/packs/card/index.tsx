import React, {useState} from 'react';
import { Form, Input, Button, Space } from 'antd';
import { ArtSelector } from "../../auctionCreate/artSelector";
import { AuctionCategory, AuctionState } from "../../auctionCreate";
import { SafetyDepositDraft } from "../../../actions/createAuctionManager";
import { Creator } from "@oyster/common";

const valueU32 = 4294967295;

function AddCard({ confirm, backButton }) {
  const [distribution, setDistribution] = useState();
  const [attributes, setAttributes] = useState<AuctionState>({
    reservationPrice: 0,
    items: [],
    category: AuctionCategory.Open,
    auctionDurationType: 'minutes',
    gapTimeType: 'minutes',
    winnersCount: 1,
    startSaleTS: undefined,
    startListTS: undefined,
  });
  const pack = attributes.items[0];
  const onSubmit = (values: any) => {
    console.log('Success:', values);
    confirm({ step: 2, values })
  };

  const onSubmitFailed = (errorInfo: any) => {
      console.log('Failed:', errorInfo);
  };

  const onMutableChange = (value: any) => {
      console.log('onMutableChange:', value);
  };

  let artistFilter = (i: SafetyDepositDraft) =>
    !(i.metadata.info.data.creators || []).find((c: Creator) => !c.verified);

  console.log('attributes', attributes)
  return (
    <div className="form-box">
      <Form
        name="addCard"
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        initialValues={{ remember: true }}
        onFinish={onSubmit}
        onFinishFailed={onSubmitFailed}
        autoComplete="off"
        layout="vertical"
      >
        <ArtSelector
          filter={artistFilter}
          selected={attributes.items}
          setSelected={items => {
            setAttributes({ ...attributes, items });
          }}
          allowMultiple={false}
        >
          Select NFT
        </ArtSelector>

        <Form.Item
            label="Max supply"
            name="max_supply"
            rules={[{ required: true, message: 'Please input max supply' }]}
        >
            <Input type={"number"} maxLength={valueU32} />
        </Form.Item>

        {
          distribution === "fixed" && ( // TODO change getting distribution from PACK
            <Form.Item
              label="Probability"
              name="probability"
              rules={[{required: true, message: 'Please input allowed probability!'}]}
            >
              <Input type={"number"} maxLength={valueU32}/>
            </Form.Item>
          )
        }

        <Space style={{ marginTop: 30 }}>
          <Form.Item style={{ margin: 0 }}>
            <Button type="primary" htmlType="submit" style={{ height: 50 }}>
              Add card to pack
            </Button>
          </Form.Item>
          {backButton}
        </Space>
      </Form>
    </div>
  );
}

export default AddCard;
