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

interface ContentCardProps {
  title: String;
  description: String;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  title,
  description,
}) => {
  return (
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
      <div className={'body-title'}>{title}</div>
      <div className={'body-content'}>{description}</div>
      <div className={'line'} />
    </Card>
  );
};

interface ModalContentProps {
  children: ReactNode[];
}

export const ModalContent: React.FC<ModalContentProps> = ({ children }) => {
  return (
    <div className="site-card-wrapper">
      <Row gutter={16}>
        <Col span={8}>{children[0]} </Col>
        <Col span={8}>{children[1]}</Col>
        <Col span={8}>{children[2]}</Col>
      </Row>
    </div>
  );
};

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
        <ModalContent>
          <ContentCard
            title="Create a SOL wallet"
            description="SOL is the cryptocurrency used for all transactions on the
                    Solana network, and it’s the currency we use on Topps' NFTs.
                    All of the NFTs on our platform can be purchased with SOL.
                    Creators get paid in it, too."
          ></ContentCard>
          <ContentCard
            title="Add funds to your wallet"
            description="SOL is the cryptocurrency used for all transactions on the
                    Solana network, and it’s the currency we use on Topps' NFTs.
                    All of the NFTs on our platform can be purchased with SOL.
                    Creators get paid in it, too."
          ></ContentCard>
          <ContentCard
            title="Connect your wallet to Topps and place a bid."
            description="SOL is the cryptocurrency used for all transactions on the
                    Solana network, and it’s the currency we use on Topps' NFTs.
                    All of the NFTs on our platform can be purchased with SOL.
                    Creators get paid in it, too."
          ></ContentCard>
        </ModalContent>
      </Modal>
    </>
  );
};
