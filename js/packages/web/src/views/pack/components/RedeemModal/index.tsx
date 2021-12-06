import React, { ReactElement, useCallback, useState } from 'react';
import { Col, Modal, Row, Space, Spin } from 'antd';
import { CheckOutlined, LoadingOutlined } from '@ant-design/icons';
import { shortenAddress } from '@oyster/common';

import ClaimingPackStep from './components/ClaimingPackStep';
import TransactionApprovalStep from './components/TransactionApprovalStep';
import { useArt } from '../../../../hooks';
import { usePack } from '../../contexts/PackContext';

interface RedeemModalProps {
  isModalVisible: boolean;
  onClose: () => void;
}

enum openState {
  Ready,
  TransactionApproval,
  Finding,
  Found,
}

const CLOSE_TIMEOUT = 2500;

const RedeemModal = ({
  isModalVisible,
  onClose,
}: RedeemModalProps): ReactElement => {
  const { handleOpenPack, pack, metadataByPackCard, voucherMetadataKey, isProvingProcess } =
    usePack();
  const [modalState, setModalState] = useState<openState>(openState.Ready);

  const numberOfNFTs = pack?.info?.packCards || 0;
  const numberOfAttempts = pack?.info?.allowedAmountToRedeem || 0;

  const art = useArt(voucherMetadataKey);
  const creators = (art.creators || []).map(
    creator => creator.name || shortenAddress(creator.address || ''),
  );

  const handleOpen = async () => {
    setModalState(openState.Finding);

    try {
      await handleOpenPack();

      setModalState(openState.Found);
    } catch {
      setModalState(openState.Ready);
    } finally {
      setTimeout(() => handleClose(), CLOSE_TIMEOUT);
    }
  };

  const handleClose = useCallback(() => {
    if (modalState !== openState.Finding) {
      onClose();
      setModalState(openState.Ready);
    }
  }, [modalState, onClose, setModalState]);

  const onClickOpen = useCallback(() => {
    if (modalState === openState.Ready) {
      return setModalState(openState.TransactionApproval);
    }

    handleOpen();
  }, [modalState]);

  const isModalClosable =
    modalState !== openState.Finding &&
    modalState !== openState.TransactionApproval;
  const isFirstsSteps =
    modalState === openState.Ready ||
    modalState === openState.TransactionApproval;

  return (
    <Modal
      className="modal-redeem-wr"
      centered
      width={500}
      mask={false}
      visible={isModalVisible}
      onCancel={handleClose}
      footer={null}
      closable={isModalClosable}
    >
      <div className="modal-redeem">
        {isFirstsSteps && (
          <>
            {modalState === openState.Ready ? (
                <ClaimingPackStep
                  onClose={onClose}
                  metadataByPackCard={metadataByPackCard}
                  numberOfAttempts={numberOfAttempts}
                  numberOfNFTs={numberOfNFTs}
                  creators={creators}
                />
              ) : (
                <TransactionApprovalStep
                  goBack={() => setModalState(openState.Ready)}
                />
              )}
            <div className="modal-redeem__footer">
              <p className="general-desc">
                Once opened, a Pack cannot be resealed.
              </p>

              <button className="modal-redeem__open-nft" onClick={onClickOpen}>
                <span>{isProvingProcess ? 'Resume Opening Pack' : 'Open Pack'}</span>
              </button>
            </div>
          </>
        )}
        {!isFirstsSteps && (
          <div className="modal-redeem__body">
            <div className="finding-body">
              <Space direction="vertical">
                {modalState === openState.Finding ? (
                  <Spin
                    indicator={
                      <LoadingOutlined className="finding-body__spinner" spin />
                    }
                  />
                ) : (
                  <div className="finding-body__check">
                    <div className="icon-wrapper">
                      <CheckOutlined />
                    </div>
                  </div>
                )}
                <p className="finding-body__title">Finding your NFT</p>
                <p className="finding-body__desc">
                  NFTs are randomly distributed throughout
                  <br />
                  the totall supply.
                </p>
              </Space>
            </div>
            <Row className="finding-body__info">
              <Col span={3} className="finding-body__info__col center">
                <img src={'/wallet.svg'} style={{ height: 16 }} />
              </Col>
              <Col span={21} className="finding-body__info__col">
                You may also have to approve the purchase in your wallet if you
                don’t have “auto-approve” turned on.
              </Col>
            </Row>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RedeemModal;
