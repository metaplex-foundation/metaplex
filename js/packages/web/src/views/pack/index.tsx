import React, { useState } from 'react';
import { Row, Col } from 'antd';

import Card from './components/Card';
import RedeemModal from './components/RedeemModal';
import PackSidebar from './components/PackSidebar';
import { useMeta } from '@oyster/common';
import { useParams } from 'react-router';

export const PackView = () => {
  const [openModal, setOpenModal] = useState(false);
  const { id }: { id: string } = useParams();

  const { packs } = useMeta();
  const pack = packs[id];

  const total = pack?.info?.allowedAmountToRedeem || 0;
  const mockBlocks = Array.from({ length: total }, (v, i) => i);

  return (
    <div className="pack-view">
      <Row>
        <Col md={16}>
          <div className="pack-view__list">
            {mockBlocks.map((block, i) => (
              <Card key={i} value={i} />
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
