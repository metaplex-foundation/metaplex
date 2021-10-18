import React, { useState, ReactNode } from 'react';
import { Card, Modal, Button, Col, Row } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';

interface ContentCardProps {
  title: string;
  description: string;
  endElement?: ReactNode;
  imgSrc?: string;
}

export const ContentCard = (props: ContentCardProps) => {
  const {
    title = '',
    description = '',
    endElement = <div />,
    imgSrc = '',
  } = props;
  return (
    <Card
      cover={
        <div>{imgSrc ? <img src={imgSrc} /> : <CreditCardOutlined />}</div>
      }
    >
      <div>{title}</div>
      <div>{description}</div>
      {endElement}
    </Card>
  );
};

interface ModalContentProps {
  children: ReactNode[];
}

export const ModalContent: React.FC<ModalContentProps> = ({ children }) => {
  return (
    <div>
      <Row gutter={16}>
        <Col span={24} xl={8}>
          {children[0]}{' '}
        </Col>
        <Col span={24} xl={8}>
          {children[1]}
        </Col>
        <Col span={24} xl={8}>
          {children[2]}
        </Col>
      </Row>
    </div>
  );
};

interface ModalProps {
  buttonClassName?: string;
  buttonText: string;
  modalTitle: string;
  cardProps: [ContentCardProps, ContentCardProps, ContentCardProps];
  onClick?: () => void;
}

export const InstructionsModal: React.FC<ModalProps> = ({
  buttonClassName,
  buttonText,
  modalTitle,
  cardProps,
  onClick,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => {
    onClick ? onClick() : null;
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
        closeIcon={<img src={'/modals/close.svg'} />}
      >
        <ModalContent>
          <ContentCard
            title={cardProps[0].title}
            description={cardProps[0].description}
            imgSrc={cardProps[0].imgSrc}
            endElement={cardProps[0].endElement}
          />
          <ContentCard
            title={cardProps[1].title}
            description={cardProps[1].description}
            imgSrc={cardProps[1].imgSrc}
            endElement={cardProps[1].endElement}
          />
          <ContentCard
            title={cardProps[2].title}
            description={cardProps[2].description}
            imgSrc={cardProps[2].imgSrc}
            endElement={cardProps[2].endElement}
          />
        </ModalContent>
      </Modal>
    </>
  );
};
