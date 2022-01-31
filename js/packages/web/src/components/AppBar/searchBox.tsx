import React from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';

export const SearchBox = ({}) => {
  return (
    <Button
      className="search-btn"
      shape="circle"
      icon={<SearchOutlined />}
    ></Button>
  );
};

export const BetterSearchBox = ({}) => {
  const { Search } = Input;
  return (
    <Search
      placeholder="Search collections"
      className="searchbar"
      style={{ width: 400 }}
    />
  );
};
