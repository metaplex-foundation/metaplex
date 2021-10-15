import React from 'react';
import { Form, Input, Button, Select, Switch, DatePicker } from 'antd';
import { initPackSet } from '@oyster/common/dist/lib/models/metaplex/initPackSet';
import { useWallet } from "@solana/wallet-adapter-react";
import {Keypair, SystemProgram, TransactionInstruction} from "@solana/web3.js";
import {
  sendTransactionWithRetry,
  useConnection,
} from '@oyster/common';

import { PACK_CREATE_ID } from '../../../utils/ids';

const { Option } = Select;
const valueU32 = 4294967295;

function CreatePack({ confirm } ) {
  const wallet = useWallet();
  const connection = useConnection();

  const onSubmit = (values: any) => {
    setupInitPackInstructions(values)
      .then(({ instructions, signers }) => {
        sendTransactionWithRetry(
          connection,
          wallet,
          instructions,
          signers,
          'single',
        ).then((res) => {
          console.log('setupInitPackInstructions:', res);
          confirm({ step: 2, values })
        })
      })
  };

  async function setupInitPackInstructions(
    values,
  ): Promise<{
    instructions: TransactionInstruction[];
    signers: any
  }> {
    const {
      name,
      mutable,
      uri,
      distribution_type,
      allowed_amount_to_redeem,
      redeem_start_date,
      redeem_end_date,
    } = values;

    const packSet = Keypair.generate();
    const packSetRentExempt = await connection.getMinimumBalanceForRentExemption(
      338,
    );
    const instructions: TransactionInstruction[] = [];
    if (wallet?.publicKey) {
      instructions.push(
        SystemProgram.createAccount({
          fromPubkey: wallet?.publicKey,
          newAccountPubkey: packSet.publicKey,
          lamports: packSetRentExempt,
          space: 338,
          programId: PACK_CREATE_ID,
        }),
      );
    }

    const nameArray = Array.from(String(name), Number);
    const nameUint32 = new Uint32Array(nameArray)

    if (packSet.publicKey && wallet.publicKey) {
      await initPackSet(
        instructions,
        nameUint32,
        uri || 'test uri',
        mutable || false,
        distribution_type,
        allowed_amount_to_redeem || 1,
        redeem_start_date || null,
        redeem_end_date || null,
        packSet.publicKey,
        wallet.publicKey.toBase58()
      )
    }

    return { instructions, signers: [packSet] };
  }

  const onFinishFailed = (errorInfo: any) => {
      console.log('Failed:', errorInfo);
  };

  const onMutableChange = (value: any) => {
      console.log('onMutableChange:', value);
  };

  return (
    <div className="form-box">
      <Form
        name="createPack"
        initialValues={{ remember: true }}
        onFinish={onSubmit}
        onFinishFailed={onFinishFailed}
        autoComplete="off"
        layout="vertical"
      >
        <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Please input pack name' }]}
        >
          <Input type={"number"} min={1} />
        </Form.Item>

        <Form.Item name="distribution_type" label="Distribution type" rules={[{ required: true }]}>
          <Select
            className="select"
            placeholder="Select a option and change input text above"
            onChange={onMutableChange}
            bordered={false}
            allowClear
          >
            <Option value="max_supply">max_supply</Option>
            <Option value="fixed">fixed</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Allowed amount to redeem"
          name="allowed_amount_to_redeem"
          rules={[{ required: true, message: 'Please input allowed amount to redeem!' }]}
        >
          <Input type={"number"} min={1} max={valueU32} />
        </Form.Item>

        <Form.Item
          label="Uri"
          name="uri"
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Redeem start date"
          name="redeem_start_date"
        >
            <DatePicker className="date-picker" style={{ width: '100%' }}/>
        </Form.Item>
        <Form.Item
          label="Redeem end date"
          name="redeem_end_date"
        >
          <DatePicker className="date-picker" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label="Mutable"
          name="mutable"
          valuePropName="mutable"
        >
          <Switch />
        </Form.Item>

        <Form.Item style={{ paddingTop: 30 }}>
          <Button type="primary" htmlType="submit">
            Next step
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

export default CreatePack;
