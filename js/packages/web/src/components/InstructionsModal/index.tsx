import React, { useState, ReactNode } from 'react';
import { Card, Modal, Button, Col, Row } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';
import './index.less';

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

interface ModalProps {
  buttonClassName: string;
  buttonText: string;
  modalTitle: string;
  cardProps: ContentCardProps[];
}

export const InstructionsModal: React.FC<ModalProps> = ({
  buttonClassName,
  buttonText,
  modalTitle,
  cardProps,
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
      <Button className={buttonClassName} onClick={showModal}>
        {buttonText}
      </Button>
      <Modal
        title={modalTitle}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={null}
        className={'modal-box'}
      >
        <ModalContent>
          <ContentCard
            title={cardProps[0].title}
            description={cardProps[0].description}
          ></ContentCard>
          <ContentCard
            title={cardProps[1].title}
            description={cardProps[0].description}
          ></ContentCard>
          <ContentCard
            title={cardProps[2].title}
            description={cardProps[0].description}
          ></ContentCard>
        </ModalContent>
      </Modal>
    </>
  );
};
