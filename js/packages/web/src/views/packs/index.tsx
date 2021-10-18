import React from 'react';

import CreatePack from './createPack';
import AddVoucher from './voucher';
import AddCard from './card';
import PacksList from './packsList';

import {
  Layout,
  Tabs,
} from 'antd';

const { TabPane } = Tabs;

const { Content } = Layout;
export const AdminPacksView = () => {

  const callback = (key: string) => {
    console.log(key);
  }

  return (
    <Content>
      <div className="tabs-wrapper">
        <Tabs defaultActiveKey="1" onChange={callback}>
          <TabPane tab="Create Pack set" key="1">
            <CreatePack />
          </TabPane>
          <TabPane tab="Add voucher to pack" key="2">
            <AddVoucher />
          </TabPane>
          <TabPane tab="Add cart to pack" key="3">
            <AddCard />
          </TabPane>
          <TabPane tab="List of packs" key="4">
            <PacksList />
          </TabPane>
        </Tabs>
      </div>
    </Content>
  );
};
