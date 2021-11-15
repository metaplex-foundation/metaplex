import React, { ReactElement, useCallback, useState } from 'react';
import { Col, Modal, Row, Space, Spin } from 'antd';
import { CheckOutlined, LoadingOutlined } from '@ant-design/icons';
import { useParams } from 'react-router';
import { useWallet } from '@solana/wallet-adapter-react';
import { BN } from 'bn.js';
import { useConnection, useMeta, useUserAccounts } from '@oyster/common';

import RedeemCard from './components/RedeemCard';
import { useMetadataByPackCard } from './hooks/useMetadataByPackCard';
import { useUserVouchersByEdition } from '../../../artworks/hooks/useUserVouchersByEdition';
import { sendClaimPack } from './transactions/claimPack';
import { requestCard } from './utils/requestCard';

interface RedeemModalProps {
  isModalVisible: boolean;
  onClose: () => void;
}

enum openState {
  Ready,
  Finding,
  Found,
}

const CLOSE_TIMEOUT = 2500;

const RedeemModal = ({
  isModalVisible,
  onClose,
}: RedeemModalProps): ReactElement => {
  const { packs, packCards, masterEditions } = useMeta();
  const { packId, editionId }: { packId: string; editionId: string } =
    useParams();
  const wallet = useWallet();
  const connection = useConnection();
  const { accountByMint } = useUserAccounts();
  const userVouchers = useUserVouchersByEdition();
  const [modalState, setModalState] = useState<openState>(openState.Ready);

  const pack = packs[packId];
  const metadataByPackCard = useMetadataByPackCard(packId);
  const numberOfNFTs = pack?.info?.packCards || 0;
  const numberOfAttempts = pack?.info?.allowedAmountToRedeem || 0;

  const handleClaim = async () => {
    setModalState(openState.Finding);
    if (!wallet.publicKey || !wallet || !userVouchers[editionId]) {
      setModalState(openState.Ready);
      return;
    }

    const { mint: editionMint } = userVouchers[editionId];

    const voucherTokenAccount = accountByMint.get(editionMint);
    if (!voucherTokenAccount?.pubkey) {
      setModalState(openState.Ready);
      return;
    }

    const { packCardToRedeem, packCardToRedeemIndex } = await requestCard({
      userVouchers,
      pack,
      editionId,
      connection,
      wallet,
      tokenAccount: voucherTokenAccount.pubkey,
    });

    const packCardMetadata = metadataByPackCard[packCardToRedeem];
    const userToken = packCards[packCardToRedeem]?.info?.tokenAccount;

    if (!packCardMetadata?.info?.masterEdition || !userToken) {
      setModalState(openState.Ready);
      return;
    }

    const packCardEdition = masterEditions[packCardMetadata.info.masterEdition];
    const packCardEditionIndex = packCardEdition.info.supply.toNumber() + 1;

    await sendClaimPack({
      connection,
      wallet,
      index: packCardToRedeemIndex,
      packSetKey: pack.pubkey,
      voucherToken: voucherTokenAccount.pubkey,
      userToken,
      voucherMint: editionMint,
      metadataMint: packCardMetadata.info.mint,
      edition: new BN(packCardEditionIndex),
    });

    setModalState(openState.Found);

    setTimeout(() => handleClose(), CLOSE_TIMEOUT);
  };

  const handleClose = useCallback(() => {
    if (modalState !== openState.Finding) {
      onClose();
      setModalState(openState.Ready);
    }
  }, [modalState, onClose, setModalState]);

  return (
    <Modal
      className="modal-redeem-wr"
      centered
      width={500}
      mask={false}
      visible={isModalVisible}
      onCancel={handleClose}
      footer={null}
      closable={modalState !== openState.Finding}
    >
      <div className="modal-redeem">
        {modalState === openState.Ready && (
          <>
            <div>
              <p className="modal-redeem__title">Claim an NFT</p>
            </div>
            <div className="modal-redeem__body">
              <p className="body-title">Pack of {numberOfNFTs}</p>
              <p className="body-desc">
                Your NFT pack from Street Dreams grants you {numberOfAttempts}{' '}
                chances to own any of the following collectibles.
              </p>

              <div className="modal-redeem__cards">
                <p>POTENTIAL NFTs</p>
                {metadataByPackCard &&
                  Object.values(metadataByPackCard)?.map(
                    item =>
                      item && (
                        <RedeemCard
                          key={item.pubkey}
                          item={item}
                          probability={item.probability}
                        />
                      ),
                  )}
              </div>

              <p className="general-desc">
                Once opened, a Pack cannot be resealed.
              </p>

              <button className="modal-redeem__open-nft" onClick={handleClaim}>
                <span>Open NFT</span>
              </button>
            </div>
          </>
        )}
        {modalState !== openState.Ready && (
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
