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
    <Form.Control
      style={{ backgroundColor: "#2B3A6A" }}
      as="select"
      onChange={onChange}
      className="btn-secondary"
      key={defaultParam}
      defaultValue={defaultParam}
    >
      {option.map(item => {
        return (
          <option value={item} key={item}>
            {item}
          </option>
        );
      })}
    </Form.Control>
  );
};
