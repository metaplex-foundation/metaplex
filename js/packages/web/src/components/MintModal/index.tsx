import React from 'react';
import { Modal } from 'antd';
import { BulkMinter } from '@holaplex/ui';
import styled from 'styled-components';
import { Connection } from '@solana/web3.js';
import { holaSignMetadata } from './sign-meta';
import { useAnalytics } from '../Analytics';
import { useStore } from '../../../../common/dist/lib';
import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet } from '@metaplex/js';

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
    background-color: rgb(51, 51, 51);
  }

  .ant-modal-wrap {
    overflow-x: hidden;
  }
`;
const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_ENDPOINT as string,
);

interface MintModalProps {
  show: boolean;
  onClose: () => void;
}

const MintModal = ({ show, onClose }: MintModalProps) => {
  const { storefront } = useStore();
  const { track } = useAnalytics();
  const wallet = useWallet();

  if (!wallet?.publicKey) {
    return null;
  }

  return (
    <StyledModal
      destroyOnClose
      footer={[]}
      onCancel={onClose}
      visible={show}
      width="100%"
      bodyStyle={{ height: '100%' }}
      closable={false}
      maskStyle={{ overflowX: 'hidden' }}
      wrapProps={{ style: { overflowX: 'hidden', zIndex: 1031 } }}
    >
      <BulkMinter
        wallet={wallet as Wallet}
        track={track}
        connection={connection}
        storefront={storefront}
        holaSignMetadata={holaSignMetadata}
        onClose={onClose}
      />
    </StyledModal>
  );
};

export default MintModal;
