import { CreditCardOutlined } from '@ant-design/icons';
import { Button, ButtonProps, Card, Col, Modal, Row } from 'antd';
import React, { ReactNode, useState } from 'react';

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

interface ModalProps {
  buttonType?: ButtonProps['type'];
  buttonSize?: ButtonProps['size'];
  buttonBlock?: boolean;
  buttonText: string;
  modalTitle: string;
  cardProps: [ContentCardProps, ContentCardProps, ContentCardProps];
  onClick?: () => void;
}

export const InstructionsModal: React.FC<ModalProps> = ({
  buttonType,
  buttonSize,
  buttonBlock,
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
      <Button block={buttonBlock} type={buttonType} size={buttonSize} onClick={showModal}>
        {buttonText}
      </Button>
      <Modal
        width={1000}
        className="metaplex-instructions-modal"
        title={modalTitle}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={null}
        closeIcon={<img src="/modals/close.svg" />}
      >
        <Row gutter={16}>
          {cardProps.map((props, i) => (
            <Col key={i} span={24} xl={8}>
              <ContentCard {...props} />
            </Col>
          ))}
        </Row>
      </Modal>
    </>
  );
};
