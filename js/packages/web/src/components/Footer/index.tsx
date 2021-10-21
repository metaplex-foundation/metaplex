import React from 'react';
import { SendOutlined } from '@ant-design/icons';
import { Button, Form, Input } from 'antd';
import { footerConf } from './footerData';
import { LABELS } from '../../constants';

export const Footer = () => {
  const validateMessages = {
    types: {
      email: 'Input is not a valid email!',
    },
  };

  const CustomForm = (props: {
    status?: string;
    message?: string;
    onValidated?: (val: any) => void;
  }) => {
    let email: any;
    const submit = (values: any) => {
      email = values.user.email;
      email &&
        email.indexOf('@') > -1 &&
        props.onValidated &&
        props.onValidated({
          EMAIL: email,
          // NAME: name.value
        });
    };
    return (
      <>
        <Form onFinish={submit} validateMessages={validateMessages}>
          <Form.Item
            name={['user', 'email']}
            rules={[
              {
                type: 'email',
              },
            ]}
          >
            <Input type="text" placeholder="Email Address" bordered={false} />
            <Button htmlType="submit">
              <SendOutlined />
            </Button>
          </Form.Item>
        </Form>
        {props.status ? (
          <div>
            {props.status === 'sending' && <div>Loading...</div>}
            {props.status === 'error' && (
              <div dangerouslySetInnerHTML={{ __html: props.message ?? '' }} />
            )}
            {props.status === 'success' && (
              <div dangerouslySetInnerHTML={{ __html: props.message ?? '' }} />
            )}
          </div>
        ) : null}
      </>
    );
  };

  const NewsLetterForm = () => (
    // TODO: remove use of deprecated DOM API
    <CustomForm status={status} />
  );

  return (
    <div>
      <div>
        {footerConf.showShopName ? (
          <div>
            <div>{LABELS.STORE_NAME} NFT Marketplace</div>
            <div>Powered by Metaplex and Solana</div>
          </div>
        ) : null}
        {footerConf.components.map((component, i) => (
          <div key={i}>
            <div>{component.title}</div>
            {component.links.map((link, j) => (
              <div key={j}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              </div>
            ))}
          </div>
        ))}
        {footerConf.showEmailSubscriber ? (
          <div>
            <div>{footerConf.emailSubscriberText}</div>
            <NewsLetterForm />
          </div>
        ) : null}
      </div>
      <div>2021 {LABELS.STORE_NAME} LLC, All rights reserved</div>
    </div>
  );
};
