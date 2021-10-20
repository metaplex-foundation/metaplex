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
        option.map((item)=>{
          return <option value={item} selected={item == defoultParam}>{item}</option>;
        })
      }
    </Form.Control>
  );
};
