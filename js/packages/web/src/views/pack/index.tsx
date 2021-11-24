import React, {useCallback, useEffect, useMemo, useState} from 'react';
import { Row, Col } from 'antd';

import Card from './components/Card';
import RedeemModal from './components/RedeemModal';
import PackSidebar from './components/PackSidebar';
import { useMeta } from '@oyster/common';
import { useParams } from 'react-router';
import { usePackState } from './hooks/usePackState';
import ArtCard from './components/ArtCard';
import OpenPackButton from "./components/OpenPackButtom";

export const PackView = () => {
  const [openModal, setOpenModal] = useState(false);
  const { packId, editionId }: { packId: string; editionId?: string } =
    useParams();
  const { packs, metadata } = useMeta();
  const { isLoading, mockBlocks, packMetadata, handleFetch } = usePackState(
    packId,
    editionId,
  );

  const pack = packs[packId];
  const metaInfo = useMemo(
    () => metadata.find(meta => meta?.info?.edition === editionId),
    [metadata, editionId]
  );

  const handleToggleModal = useCallback(async () => {
    setOpenModal(!openModal);
  }, [openModal]);

  useEffect(() => {
    if (!openModal) {
      handleFetch();
    }
  }, [openModal]);

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
                />
              ))}
          </div>
        </Col>
        <Col md={8} className="pack-view__sidebar-container">
          <PackSidebar pack={pack} id={metaInfo?.pubkey} />
          <OpenPackButton onClick={handleToggleModal} />
        </Col>
      </Row>

      <RedeemModal isModalVisible={openModal} onClose={handleToggleModal} />
    </div>
  );
};
