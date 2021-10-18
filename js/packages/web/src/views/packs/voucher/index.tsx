import React, { useState } from 'react';
import { Form, Button, Space } from 'antd';
import { Creator } from "@oyster/common";

import { ArtSelector } from "../../auctionCreate/artSelector";
import { SafetyDepositDraft } from "../../../actions/createAuctionManager";

const AddVoucher = ({ attributes, setAttributes, confirm, backButton }) => {
  const onSubmit = (values: any) => {
    console.log('Success:', values);
    confirm(2)
  };

  const onSubmitFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
  };

  const handleVoucherCountUpdate = (e, id) => {
    const { value } = e.target;
    const current = { [id]: value };
    const listUpdated = { ...attributes.vouchersCount, ...current }

    setAttributes({ ...attributes, vouchersCount: listUpdated });
  }

  const artistFilter = (i: SafetyDepositDraft) =>
    !(i.metadata.info.data.creators || []).find((c: Creator) => !c.verified);

  return (
    <div className="form-box">
      <Form
        name="addVoucher"
        initialValues={{ remember: true }}
        onFinish={onSubmit}
        onFinishFailed={onSubmitFailed}
        autoComplete="off"
        layout="vertical"
      >
        <ArtSelector
          title="Select the NFT that you want add to Pack"
          description="Select the NFT that you want to add"
          filter={artistFilter}
          selected={attributes.vouchersItems}
          setSelected={vouchersItems => {
            setAttributes({ ...attributes, vouchersItems });
          }}
          selectedCount={(id) => attributes.vouchersCount[id]}
          allowMultiple={false}
        >
          Select NFT
        </ArtSelector>

        <Space style={{ marginTop: 30 }}>
          <Form.Item style={{ margin: 0 }}>
            <Button type="primary" htmlType="submit" style={{ height: 50 }}>
              Next step
            </Button>
          </Form.Item>
          {backButton}
        </Space>
      </Form>
    </div>
  );
}

export default AddVoucher;
