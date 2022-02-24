import React from 'react';
import { Modal } from 'antd';
import { BulkMinter } from '@holaplex/ui';
import styled from 'styled-components';
import { holaSignMetadata } from './sign-meta';
import {
  ENDPOINTS,
  useLocalStorageState,
  useStore,
} from '../../../../common/dist/lib';
import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet } from '@metaplex/js';
import { Connection } from '@solana/web3.js';
import { useNavigate } from 'react-router-dom';
import { useAnalytics } from '../../contexts';

const StyledModal = styled(Modal)`
  margin: 0;
  top: 0;
  padding: 0;
  min-height: 100vh;
  z-index: 1031;

  .ant-modal-body {
    padding: 0;
  }

  .ant-modal-content {
    width: 100vw;
    min-height: 100vh;
    overflow-y: scroll;
    margin: 0;
    top: 0;
  }

  .ant-modal-wrap {
    overflow-x: hidden;
  }
`;

interface MintModalProps {
  show: boolean;
  onClose: () => void;
}

const MintModal = ({ show, onClose }: MintModalProps) => {
  const { storefront } = useStore();
  const { track } = useAnalytics();
  const wallet = useWallet();
  const navigate = useNavigate();
  const [savedEndpoint] = useLocalStorageState(
    'connectionEndpoint',
    ENDPOINTS[0].endpoint,
  );

  // how can we get rid of this and just use the context?
  const connection = new Connection(savedEndpoint);

  if (!wallet?.publicKey) {
    return null;
  }

  const goToOwnedRoute = () => {
    navigate('/owned');
    onClose();
  };

  return (
    <StyledModal
      destroyOnClose
      footer={null}
      onCancel={onClose}
      visible={show}
      width="100%"
      bodyStyle={{ height: '100%' }}
      closable={false}
      maskStyle={{ overflowX: 'hidden' }}
      wrapProps={{ style: { overflowX: 'hidden', zIndex: 1031 } }}
      className="blk-minter-modal"
    >
      <BulkMinter
        wallet={wallet as Wallet}
        track={track}
        storefront={storefront}
        holaSignMetadata={holaSignMetadata}
        onClose={onClose}
        connection={connection}
        savedEndpoint={savedEndpoint}
        goToOwnedRoute={goToOwnedRoute}
      />
    </StyledModal>
  );
};

export default MintModal;
