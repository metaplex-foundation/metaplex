import React, {useState} from 'react';
import {Form, Input, Button, Select} from 'antd';
import { Creator } from "@oyster/common";

import { ArtSelector } from "../../auctionCreate/artSelector";
import { SafetyDepositDraft } from "../../../actions/createAuctionManager";
import { AuctionCategory, AuctionState } from "../../auctionCreate";

const { Option } = Select;

function AddVoucher() {
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
  const onSubmit = (values: any) => {
    console.log('Success:', values);
  };

  const onSubmitFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
  };

  const onMutableChange = (value: any) => {
    console.log('onMutableChange:', value);
  };

  let artistFilter = (i: SafetyDepositDraft) =>
    !(i.metadata.info.data.creators || []).find((c: Creator) => !c.verified);

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
          name="action_on_prove"
          label="Action on prove"
          rules={[{ required: true }]}
        >
          <Select
            className="select"
            placeholder="Select a option"
            onChange={onMutableChange}
            bordered={false}
            allowClear
          >
            <Option value="Burn">Burn</Option>
            <Option value="Redeem">Redeem</Option>
          </Select>
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
