import React, {useCallback, useEffect, useMemo, useState} from 'react';
import { Row, Col } from 'antd';

import Card from './components/Card';
import RedeemModal from './components/RedeemModal';
import PackSidebar from './components/PackSidebar';
import { useMeta } from '@oyster/common';
import { useParams } from 'react-router';
import { usePackState } from './hooks/usePackState';
import ArtCard from './components/ArtCard';
import OpenPackButton from './components/OpenPackButtom';

export const PackView = () => {
  const [openModal, setOpenModal] = useState(false);
  const { packKey }: { packKey: string } = useParams();
  const { packs, vouchers } = useMeta();
  const { isLoading, mockBlocks, packMetadata, handleFetch } =
    usePackState(packKey);
  const voucher = useMemo(
    () =>
      Object.values(vouchers).find(
        voucher => voucher?.info?.packSet === packKey,
      ),
    [vouchers, packKey],
  );

  const pack = packs[packKey];

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
              mockBlocks.map((block, i) => <Card key={i} value={block} />)}
          </div>
        </Col>
        <Col md={8} className="pack-view__sidebar-container">
          <PackSidebar pack={pack} id={voucher?.info?.metadata} />
          <OpenPackButton onClick={handleToggleModal} />
        </Col>
      </Row>

      <RedeemModal isModalVisible={openModal} onClose={handleToggleModal} />
    </div>
  );
};
