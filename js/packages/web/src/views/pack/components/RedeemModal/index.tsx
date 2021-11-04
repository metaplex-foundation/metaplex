import React  from 'react';
import { Modal } from "antd";

import RedeemCard from "../RedeemCard";

const mockCardsList = [
  {
    name: 'Morning',
    desc: 'Street Dreams',
    percentage: 64.4,
    src: '/sol-circle.svg',
  },
  {
    name: 'Rocky, colt, & turn',
    desc: 'Street Dreams',
    percentage: 0.2,
    src: '/sol-circle.svg',
  },
  {
    name: 'Portrait',
    desc: 'Street Dreams',
    percentage: 33.4,
    src: '/sol-circle.svg',
  },
]
const RedeemModal = ({ isModalVisible, onClose }) => (
  <Modal
    centered
    width={'500px'}
    mask={false}
    visible={isModalVisible}
    onCancel={onClose}
    footer={null}
    className="modal-redeem-wr"
  >
    <div className="modal-redeem">
      <div>
        <p className="modal-redeem__title">Claim an NFT</p>
      </div>
      <div className="modal-redeem__body">

        <p className="body-title">Pack of 8</p>
        <p className="body-desc">
          Your NFT pack from Street Dreams grants you 8 chances to own any of the following collectibles.
        </p>

        <div className="modal-redeem__cards">
          <p>POTENTIAL NFTs</p>
          {
            mockCardsList.map((card) => (
              <RedeemCard card={card} />
            ))
          }
        </div>

        <p className="general-desc">Once opened, a Pack cannot be resealed.</p>

        <button
          className="modal-redeem__open-nft"
          onClick={onClose}
        >
          <span>Open first NFT</span>
        </button>
      </div>
    </div>
  </Modal>
)

export default RedeemModal;
