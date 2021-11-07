import React, { useCallback, useState } from 'react';
import { Row, Col } from 'antd';

import Card from './components/Card';
import RedeemModal from './components/RedeemModal';
import PackSidebar from './components/PackSidebar';
import { useMeta } from '@oyster/common';
import { useParams } from 'react-router';
import { usePackState } from './hooks/usePackState';
import ArtCard from './components/ArtCard';

export const PackView = () => {
  const [openModal, setOpenModal] = useState(false);
  const { packId, editionId }: { packId: string; editionId?: string } =
    useParams();
  const { packs } = useMeta();
  const { isLoading, mockBlocks, packMetadata } = usePackState(
    packId,
    editionId,
  );

  const pack = packs[packId];
  const isUserPackPage = !!editionId;

  const handleCardClick = useCallback(() => {
    if (!editionId) {
      return;
    }

    setOpenModal(true);
  }, [setOpenModal]);

  return (
    <div className="pack-view">
      <Row>
        <Col md={16}>
          <div className="pack-view__list">
            {!isLoading &&
              packMetadata.map(({ metadata }) => (
                <ArtCard key={metadata.pubkey} pubkey={metadata.pubkey} />
              ))}
            {!isLoading &&
              mockBlocks.map((block, i) => (
                <Card
                  key={i}
                  value={block}
                  onClick={handleCardClick}
                  isHoverable={isUserPackPage}
                />
              ))}
          </div>
        </Col>
        <Col md={8}>
          <PackSidebar pack={pack} />
        </Col>
      </Row>

      <RedeemModal
        isModalVisible={openModal}
        onClose={() => setOpenModal(false)}
      />
    </div>
  );
};
