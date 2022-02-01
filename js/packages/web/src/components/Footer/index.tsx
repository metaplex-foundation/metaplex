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
    status: any;
    message: any;
    onValidated: any;
  }) => {
    let email: any;
    const submit = (values: any) => {
      email = values.user.email;
      email &&
        email.indexOf('@') > -1 &&
        props.onValidated({
          EMAIL: email,
          // NAME: name.value
        });
    };
    return (
      <>
        <Form
          className={'footer-sign-up'}
          onFinish={submit}
          validateMessages={validateMessages}
        >
          <Form.Item
            name={['user', 'email']}
            rules={[
              {
                type: 'email',
              },
            ]}
            style={{ display: 'flex !important' }}
          >
            <Input
              className={'footer-input'}
              type="text"
              id="input"
              placeholder="Email Address"
              bordered={false}
            />
            <div className="btn-padding" ><Button className="secondary-btn email-btn"  htmlType="submit">
              Submit
            </Button></div>
           
          </Form.Item>
        </Form>
        {props.status ? (
          <div
            style={{
              background: 'rgb(217,217,217)',
              borderRadius: 2,
              padding: 10,
              display: 'inline-block',
            }}
          >
            {props.status === 'sending' && (
              <div style={{ color: 'blue' }}>Loading...</div>
            )}
            {props.status === 'error' && (
              <div
                style={{ color: 'red' }}
                dangerouslySetInnerHTML={{ __html: props.message }}
              />
            )}
            {props.status === 'success' && (
              <div
                style={{ color: 'green' }}
                dangerouslySetInnerHTML={{ __html: props.message }}
              />
            )}
          </div>
        ) : null}
      </>
    );
  };

  const NewsLetterForm = () => (
    <CustomForm status={status} message={''} onValidated={() => {}} />
  );

  return (
    <div className="footer-container">
      <div className="footer-info">
        {footerConf.showShopName ? (
          <div className="footer-community subscriber-container">
            <div className="sub-header">
              {/*LABELS.STORE_NAME*/} Stay up to date
            </div>
            {/*<div className="footer-link">Powered by Metaplex and Solana</div>*/}
            {footerConf.showEmailSubscriber ? (
          <div className="subscriber-text">
            <div className="subscriber-text">
              {footerConf.emailSubscriberText}
            </div>
            <div><NewsLetterForm /></div>
          </div>
          

        ) : null}
      <div className="sub-header-community">Join the Community</div>
      <div className='social-media-bar'>
              <div img-paddin> <img
                      className="social-photo img-paddin"
                      src="/twitter.png"
                      alt="twitter"
                    /></div>
                    <div img-paddin> <img
                      className="social-photo img-paddin"
                      src="/instagram.png"
                      alt="twitter"
                    /></div>
                    <div> <img
                      className="social-photo img-paddin"
                      src="/discord.png"
                      alt="twitter"
                    /></div>
            </div>

            <div className="logo-paddin"> <img
                      className="footer-logo"
                      src="/footer-logo.png"
                      alt="twitter"
                    /></div>

          </div>
          
        ) : null}
        {footerConf.components.map(component => (
          <div className="footer-section-container">
            <div className="sub-header">{component.title}</div>
            {component.links.map(link => (
              <div className="body-text">
                <a href={link.url} target="_blank" className="footer-link">
                  {link.label}
                </a>
              </div>
            ))}
          </div>
        ))}

      </div>
      <div className="footer-foot">
        <div className="small-body footer-link">
          2022 {LABELS.STORE_NAME} LLC, All rights reserved
        </div>
      </div>
    </div>
  );
};
