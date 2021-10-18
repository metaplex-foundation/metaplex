import React from 'react';
import { Form, Input, Button, Space } from 'antd';
import { ArtSelector } from "../../auctionCreate/artSelector";
import { SafetyDepositDraft } from "../../../actions/createAuctionManager";
import { Creator } from "@oyster/common";

const valueU32 = 4294967295;

function AddCard({ attributes, setAttributes, confirm, backButton, distribution }) {
  const onSubmit = (values: any) => {
    console.log('Success:', values);
    confirm(3)
  };

  const onSubmitFailed = (errorInfo: any) => {
      console.log('Failed:', errorInfo);
  };

  const handleCardsCountUpdate = (e, id) => {
    const { value } = e.target;
    const current = { [id]: value };
    const listUpdated = { ...attributes.cardsCount, ...current }

    setAttributes({ ...attributes, cardsCount: listUpdated });
  }

  const artistFilter = (i: SafetyDepositDraft) =>
    !(i.metadata.info.data.creators || []).find((c: Creator) => !c.verified);

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
          title="Select the NFT that you want add to Pack"
          description="Select the NFT that you want to add"
          filter={artistFilter}
          selected={attributes.cardsItems}
          setSelected={cardsItems => {
            setAttributes({ ...attributes, cardsItems });
          }}
          setCounts={handleCardsCountUpdate}
          selectedCount={(id) => attributes.cardsCount[id]}
          allowMultiple
          isListView
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
          distribution === "fixed" && (
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
              Create pack
            </Button>
          </Form.Item>
          {backButton}
        </Space>
      </Form>
    </div>
  );
}

export default AddCard;
