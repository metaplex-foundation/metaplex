import React, { useState } from "react";
import { Divider, Modal, Card } from 'antd';
import { MetaAvatarDetailed } from '../MetaAvatar';


const stubs = {
  creators: [{
    name: 'test user 132',
    link: '',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ9BHf9iIdHJa14FRWqWCHzY9GD8M-3dZBI9w&usqp=CAU'
  }]
}

export const RedeemItemModal = () => {
  const [open, setOpen] = useState(true) // remove after
  return (
    <Modal
      visible={open}
      footer={null}
      width={1200}
      onCancel={() => setOpen(false)}
      bodyStyle={{
        borderRadius: 12
      }}
      closeIcon={<img src={'/modals/close.svg'} />}
    >
      <div className="redeem-modal-container">
        <Card className="redeem-modal-item content-wrapper">
          <div style={{ width: 368, height: 524, background: "black" }}>
            {/*Stub content remove it*/}
          </div>
        </Card>
        <Card
          className="redeem-modal-item details-wrapper"
          cover={
            <div className="header">
              <MetaAvatarDetailed size={32} creators={stubs.creators} />
              <Divider className="divider" />
            </div>
          }
        >
          <div className="redeem-modal-item-container">
            <div className="item-row">
              <h1 className="content-title">Morning</h1>
              <div className="content-description">
                Street Dreams is a collective of creators rooted in photography who have invested heavily in the art of photography.
              </div>
            </div>
            <div className="item-row">
              <div className="item-row-title">Attributes</div>
              <div className="attributes-container">
                <div className="attribute">
                  <div className="attribute-title">Background</div>
                  <h4 className="attribute-name">Send</h4>
                </div>
                <div className="attribute">
                  <div className="attribute-title">Model</div>
                  <h4 className="attribute-name">Sabrina</h4>
                </div>
                <div className="attribute">
                  <div className="attribute-title">Location</div>
                  <h4 className="attribute-name">Atlanta</h4>
                </div>
              </div>
            </div>
            <div className="item-row">
              <div className="item-row-title">Creator Royalties (10%)</div>
              <MetaAvatarDetailed size={32} creators={stubs.creators} />
            </div>
          </div>
        </Card>
      </div>
    </Modal>
  );
}
