import React, { useState } from 'react';
import { Row, Col } from 'antd';

import Card from './components/Card';
import RedeemModal from './components/RedeemModal';
import PackSidebar from './components/PackSidebar';

export const PackView = () => {
  const [openModal, setOpenModal] = useState(false);
  const mockBlocks = Array.from({ length: 10 }, (v, i) => i);

  return (
    <div className="pack-view">
      <Row>
        <Col md={16}>
          <div className="pack-view__list">
            {mockBlocks.map((block, i) => (
              <Card value={i} onOpen={setOpenModal} />
            ))}
          </div>
        </Col>
        <Col md={8}>
          <PackSidebar />
        </Col>
      </Row>

      <RedeemModal
        isModalVisible={openModal}
        onClose={() => setOpenModal(false)}
      />
    </div>
  );
};
