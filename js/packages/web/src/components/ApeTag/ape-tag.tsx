import { Tag } from 'antd';
import React from 'react';

export const ApeTag = ({trait_type, value}:{trait_type:string, value:string}) => <Tag 
  key={trait_type} 
  style={{ color: 'black', borderRadius: '9999rem', padding: '0.5rem 1rem', marginBottom: '0.5rem' }}>
  {trait_type} : {value}
</Tag>