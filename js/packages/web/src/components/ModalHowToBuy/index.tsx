import React, { useState, ReactNode } from 'react';
import { Card, Modal, Button, Col, Row } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';
import { ConnectButton } from '@oyster/common';
import './index.less';

interface ModalProps {
  className: string;
  children?: {
    title?: ReactNode;
    card1?: ReactNode;
    card2?: ReactNode;
    card3?: ReactNode;
  };
}

export const ModalHowToBuy: React.FC<ModalProps> = ({
  className,
  children,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <>
      <Button className={className} onClick={showModal}>
        How to Buy
      </Button>
      <Modal
        title={children?.title ? children?.title : 'Buying NFTs Topps'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={null}
        className={'modal-box'}
      >
        <div className="site-card-wrapper">
          <Row gutter={16}>
            <Col span={8}>
              {children?.card1 ? (
                children?.card1
              ) : (
                <Card
                  cover={
                    <div className={'card-cover'}>
                      <CreditCardOutlined
                        style={{
                          color: 'rgba(179, 136, 245, 1)',
                          fontSize: 18,
                        }}
                      />
                    </div>
                  }
                >
                  <div className={'body-title'}>Create a SOL wallet</div>
                  <div className={'body-content'}>
                    SOL is the cryptocurrency used for all transactions on the
                    Solana network, and it’s the currency we use on Topps' NFTs.
                    All of the NFTs on our platform can be purchased with SOL.
                    Creators get paid in it, too.
                  </div>
                  <div className={'line'} />
                </Card>
              )}
            </Col>
            <Col span={8}>
              {children?.card1 ? (
                children?.card1
              ) : (
                <Card
                  cover={
                    <div className={'card-cover'}>
                      <CreditCardOutlined
                        style={{
                          color: 'rgba(179, 136, 245, 1)',
                          fontSize: 18,
                        }}
                      />
                    </div>
                  }
                >
                  <div className={'body-title'}>Add funds to your wallet</div>
                  <div className={'body-content'}>
                    SOL is the cryptocurrency used for all transactions on the
                    Solana network, and it’s the currency we use on Topps' NFTs.
                    All of the NFTs on our platform can be purchased with SOL.
                    Creators get paid in it, too.
                  </div>
                  <div className={'line'} />
                </Card>
              )}
            </Col>
            <Col span={8}>
              {children?.card1 ? (
                children?.card1
              ) : (
                <Card
                  cover={
                    <div className={'card-cover'}>
                      <CreditCardOutlined
                        style={{
                          color: 'rgba(179, 136, 245, 1)',
                          fontSize: 18,
                        }}
                      />
                    </div>
                  }
                >
                  <div className={'body-title'}>
                    Connect your wallet to Topps and place a bid.
                  </div>
                  <div className={'body-content'}>
                    SOL is the cryptocurrency used for all transactions on the
                    Solana network, and it’s the currency we use on Topps' NFTs.
                    All of the NFTs on our platform can be purchased with SOL.
                    Creators get paid in it, too.
                  </div>
                  <div className={'button-container'}>
                    <ConnectButton
                      type="primary"
                      className="modal-button-buy"
                    />
                  </div>
                </Card>
              )}
            </Col>
          </Row>
        </div>
      </Modal>
    </>
  );
};
