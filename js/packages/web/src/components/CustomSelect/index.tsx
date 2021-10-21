import 'antd/dist/antd.css';
import React from 'react';
import { Form } from 'react-bootstrap';

interface Props {
  option: any;
  defaultParam: string;
  onChange: (event: any) => void;
}

export const CustomSelect = ({ option, defaultParam, onChange }: Props) => {
  return (
    <Form.Control as="select" onChange={onChange} className="btn-secondary">
      {option.map(item => {
        return (
          <option value={item} selected={item == defaultParam}>
            {item}
          </option>
        );
      })}
    </Form.Control>
  );
};
