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
  const shouldEnableRedeem =
    process.env.NEXT_ENABLE_NFT_PACKS_REDEEM === 'true';

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
    }
  };

  const handleClose = useCallback(() => {
    onClose();
    setModalState(openState.Initial);
  }, [modalState, onClose, setModalState]);

  const onClickOpen = useCallback(() => {
    if (modalState === openState.Initial) {
      return setModalState(openState.TransactionApproval);
    }

    handleOpen();
  }, [modalState]);

  const isModalClosable = modalState === openState.Initial;
  const isClaiming = modalState === openState.Claiming;
  const isLoadingMetadata =
    Object.values(metadataByPackCard || {}).length !==
    (pack?.info.packCards || 0);

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
        {isClaiming && <ClaimingStep onClose={handleClose} />}
        {!isClaiming && (
          <>
            {modalState === openState.Initial && (
              <InitialStep
                onClose={onClose}
                metadataByPackCard={metadataByPackCard}
                numberOfAttempts={numberOfAttempts}
                numberOfNFTs={numberOfNFTs}
                creators={creators}
                isLoadingMetadata={isLoadingMetadata}
              />
            )}
            {modalState === openState.TransactionApproval && (
              <TransactionApprovalStep
                goBack={() => setModalState(openState.Initial)}
              />
            )}
            {shouldEnableRedeem && (
              <div className="modal-redeem__footer">
                <p className="general-desc">
                  Once opened, a Pack cannot be resealed.
                </p>

                <button
                  className="modal-redeem__open-nft"
                  disabled={isLoadingMetadata}
                  onClick={onClickOpen}
                >
                  <span>
                    {provingProcess ? 'Resume Opening Pack' : 'Open Pack'}
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default RedeemModal;
