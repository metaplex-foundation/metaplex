import { Select } from 'antd';
import 'antd/dist/antd.css';
import React from 'react';
import { Form } from 'react-bootstrap';


interface Props {
  option: any;
  defoultParam: string;
  change: (event: any) => void;
}

export const CustomSelect = ({option, defoultParam, change}: Props) => {
  return (
    <Form.Control as="select" onChange={(event)=>{change(event)}}  className="btn-secondary">
      {
        defoultParam != '' ? <option value={0}>{defoultParam}</option>: ''
      }
      {
        option.map((item)=>{
          return <option value={1}>{item}</option>;
        })
      }
    </Form.Control>
  );
};
