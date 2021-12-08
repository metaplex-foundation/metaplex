import React, { useCallback, useMemo, useState } from 'react';
import { Row, Col } from 'antd';

import Card from './components/Card';
import RedeemModal from './components/RedeemModal';
import PackSidebar from './components/PackSidebar';
import ArtCard from './components/ArtCard';
import { PackProvider, usePack } from './contexts/PackContext';

const PackView: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);
  const { isLoading, openedMetadata, cardsRedeemed, pack } = usePack();

  const cardsLeftToOpen = pack
    ? pack.info.allowedAmountToRedeem - cardsRedeemed
    : 0;
  const mockBlocks = useMemo(
    () => Array.from({ length: cardsLeftToOpen }, (_, i) => i + cardsRedeemed),
    [cardsLeftToOpen, cardsRedeemed],
  );

  const handleToggleModal = useCallback(async () => {
    setOpenModal(!openModal);
  }, [openModal]);

  return (
    <div className="pack-view">
      <Row>
        <Col md={16}>
          <div className="pack-view__list">
            {!isLoading &&
              openedMetadata.map(({ metadata }) => (
                <ArtCard key={metadata.pubkey} pubkey={metadata.pubkey} />
              ))}
            {!isLoading &&
              mockBlocks.map((block, i) => <Card key={i} value={block} />)}
          </div>
        </Col>
        <Col md={8} className="pack-view__sidebar-container">
          <PackSidebar onOpenPack={handleToggleModal} />
        </Col>
      </Row>

      <RedeemModal isModalVisible={openModal} onClose={handleToggleModal} />
    </div>
  );
};

const PackViewWithContext: React.FC = () => (
  <PackProvider>
    <PackView />
  </PackProvider>
);

export default PackViewWithContext;
