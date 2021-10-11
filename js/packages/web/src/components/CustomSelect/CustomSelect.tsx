import { Select } from 'antd';
import 'antd/dist/antd.css';
import React from 'react';
import { Form } from 'react-bootstrap';


interface Props {
  option: any,
  defoultParam: string,
}

export const CustomSelect = ({option, defoultParam}: Props) => {
  return (
    <Form.Control as="select"  className="btn-secondary">
      {
        defoultParam != '' ? <option>{defoultParam}</option>: ''
      }
      {
        option.map((item)=>{
          return <option value={item}>{item}</option>;
        })
      }
    </Form.Control>
  );
};
