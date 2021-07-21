import React from 'react';
import './index.less'
import { Card, Col, Row,  Button } from 'antd';
import { CloseOutlined, CreditCardOutlined } from '@ant-design/icons';
import {ConnectButton} from "@oyster/common";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalHowToBuy: React.FC<ModalProps> = ({
                                                      isOpen,
                                                      onClose, children
}) => {  const outsideRef = React.useRef(null);

  const handleCloseOnOverlay = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if (e.target === outsideRef.current) {
      onClose();
    }
  }

  return isOpen ? (
    <div className={ 'modal' }>
      <div
        ref={outsideRef}
        className={ 'modal-overlay' }
        onClick={ handleCloseOnOverlay }
      />
      <div className={ 'modal-box' }>
        <div className={ 'modal-buy-ntf-title' }>Buying NFTs on Topps
          <i
            className={ 'modal-close' }
            onClick={ onClose }
          >
            <CloseOutlined style={{ fontSize: 16 }} />
          </i>
        </div>
        <div className={ 'modal-buy-ntf-body' }>
          <div className="site-card-wrapper">
            <Row gutter={16}>
              <Col span={8}>
                <Card cover={<div className={ 'card-cover' }>
                  <CreditCardOutlined style = {{ color: 'rgba(179, 136, 245, 1)', fontSize: 18 }} />
                </div>}>
                  <div className={ 'body-title' }>Create a SOL wallet</div>
                  SOL is the cryptocurrency used for all transactions on the Solana network, and it’s the currency we
                  use on Topps' NFTs. All of the NFTs on our platform can be purchased with SOL.
                  Creators get paid in it, too.
                  <div className={'line'}/>
                </Card>
              </Col>
              <Col span={8}>
                <Card cover={<div className={ 'card-cover' }>
                  <CreditCardOutlined style = {{ color: 'rgba(179, 136, 245, 1)', fontSize: 18 }} />
                </div>}>
                  <div className={ 'body-title' }>Add funds to your wallet</div>
                  SOL is the cryptocurrency used for all transactions on the Solana network, and it’s the currency we
                  use on Topps' NFTs. All of the NFTs on our platform can be purchased with SOL.
                  Creators get paid in it, too.
                  <div className={'line'}/>
                </Card>
              </Col>
              <Col span={8}>
                <Card cover={<div className={ 'card-cover' }>
                  <CreditCardOutlined style = {{ color: 'rgba(179, 136, 245, 1)', fontSize: 18 }} /></div>}>
                  <div className={ 'body-title' }>Connect your wallet to Topps and place a bid.</div>
                  SOL is the cryptocurrency used for all transactions on the Solana network, and it’s the currency we
                  use on Topps' NFTs. All of the NFTs on our platform can be purchased with SOL.
                  Creators get paid in it, too.
                  <div className={ 'button-container' }>
                    <ConnectButton type="primary" className="modal-button-buy"/>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        </div>
      </div>
    </div>
  ) : null;
};

