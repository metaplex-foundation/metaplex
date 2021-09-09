import React from "react";
import {
    Layout,
  } from 'antd';

const { Content } = Layout;

export const AccessForbidden = () => {
    return (
        <Content>
          You don't have access to this page
        </Content>
    )
}