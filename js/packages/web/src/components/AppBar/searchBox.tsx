import React from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Button } from 'antd';

export const SearchBox = ({}) => {
  return (
    <Button
      className="search-btn"
      shape="circle"
      icon={<SearchOutlined />}
    ></Button>
  );
};
