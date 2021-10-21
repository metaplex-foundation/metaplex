import 'antd/dist/antd.css';
import React from 'react';
import { Form } from 'react-bootstrap';

interface Props {
  option: any;
  defoultParam: string;
  onChange: (event: React.ChangeEvent<any>) => void;
}

export const CustomSelect = ({ option, defoultParam, onChange }: Props) => {
  return (
    <Form.Control as="select" onChange={onChange} className="btn-secondary">
      {option.map(item => {
        return (
          <option value={item} selected={item == defoultParam}>
            {item}
          </option>
        );
      })}
    </Form.Control>
  );
};
