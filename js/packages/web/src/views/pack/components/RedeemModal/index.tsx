import React, { ReactElement, useCallback, useState } from 'react';
import { Modal } from 'antd';
import { shortenAddress } from '@oyster/common';

import InitialStep from './components/InitialStep';
import TransactionApprovalStep from './components/TransactionApprovalStep';
import { useArt } from '../../../../hooks';
import { usePack } from '../../contexts/PackContext';
import ClaimingStep from './components/ClaimingStep';

interface RedeemModalProps {
  isModalVisible: boolean;
  onClose: () => void;
}

enum openState {
  Initial,
  TransactionApproval,
  Claiming,
}

const CLOSE_TIMEOUT = 2500;

const RedeemModal = ({
  isModalVisible,
  onClose,
}: RedeemModalProps): ReactElement => {
  const {
    handleOpenPack,
    pack,
    metadataByPackCard,
    voucherMetadataKey,
    provingProcess,
  } = usePack();
  const [modalState, setModalState] = useState<openState>(openState.Initial);

  const numberOfNFTs = pack?.info?.packCards || 0;
  const numberOfAttempts = pack?.info?.allowedAmountToRedeem || 0;

  const art = useArt(voucherMetadataKey);
  const creators = (art.creators || []).map(
    creator => creator.name || shortenAddress(creator.address || ''),
  );

  const handleOpen = async () => {
    setModalState(openState.Claiming);

    try {
      await handleOpenPack();
    } catch {
      setModalState(openState.Initial);
    } finally {
      setTimeout(() => handleClose(), CLOSE_TIMEOUT);
    }
  };

  const handleClose = useCallback(() => {
    if (modalState !== openState.Claiming) {
      onClose();
      setModalState(openState.Initial);
    }
  }, [modalState, onClose, setModalState]);

  const onClickOpen = useCallback(() => {
    if (modalState === openState.Initial) {
      return setModalState(openState.TransactionApproval);
    }
    console.log(modalState);

    handleOpen();
  }, [modalState]);

  const isModalClosable = modalState === openState.Initial;
  const isClaiming = modalState === openState.Claiming;

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
        {isClaiming && <ClaimingStep />}
        {!isClaiming && (
          <>
            {modalState === openState.Initial && (
              <InitialStep
                onClose={onClose}
                metadataByPackCard={metadataByPackCard}
                numberOfAttempts={numberOfAttempts}
                numberOfNFTs={numberOfNFTs}
                creators={creators}
              />
            )}
            {modalState === openState.TransactionApproval && (
              <TransactionApprovalStep
                goBack={() => setModalState(openState.Claiming)}
              />
            )}
            <div className="modal-redeem__footer">
              <p className="general-desc">
                Once opened, a Pack cannot be resealed.
              </p>

              <button className="modal-redeem__open-nft" onClick={onClickOpen}>
                <span>
                  {provingProcess ? 'Resume Opening Pack' : 'Open Pack'}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default RedeemModal;
