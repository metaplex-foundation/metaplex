import { Button, Card, Modal, Space } from 'antd';
import React, { ReactNode, useMemo, useState } from 'react';
import { SafetyDepositDraft } from '../../actions/createAuctionManager';
import { MetaplexMasonry } from '../../components/MetaplexMasonry';
import { useUserArts } from '../../hooks';
import { ArtCard } from './../../components/ArtCard';

export interface ArtSelectorProps {
  className?: string;
  children?: ReactNode;
  selected: SafetyDepositDraft[];
  setSelected: (selected: SafetyDepositDraft[]) => void;
  allowMultiple: boolean;
  filter?: (i: SafetyDepositDraft) => boolean;
}

export const ArtSelector = ({
  className,
  children,
  selected,
  setSelected,
  allowMultiple,
  filter,
}: ArtSelectorProps) => {
  let items = useUserArts();
  if (filter) items = items.filter(filter);
  const selectedItems = useMemo<Set<string>>(
    () => new Set(selected.map(item => item.metadata.pubkey)),
    [selected],
  );

  const [visible, setVisible] = useState(false);

  const open = () => {
    clear();

    setVisible(true);
  };

  const close = () => {
    setVisible(false);
  };

  const clear = () => {
    setSelected([]);
  };

  const confirm = () => {
    close();
  };

  return (
    <>
      <MetaplexMasonry className={className}>
        {selected.map(m => {
          const key = m?.metadata.pubkey || '';

          return (
            <ArtCard
              key={key}
              pubkey={m.metadata.pubkey}
              preview={false}
              onClick={open}
              close={() => {
                setSelected(selected.filter(_ => _.metadata.pubkey !== key));
                confirm();
              }}
            />
          );
        })}
        {(allowMultiple || selectedItems.size === 0) && (
          <Card hoverable onClick={open}>
            {children ?? 'Add an NFT'}
          </Card>
        )}
      </MetaplexMasonry>

      <Modal
        visible={visible}
        onCancel={close}
        onOk={confirm}
        width={1100}
        footer={null}
      >
        <Space className="metaplex-space-align-stretch" direction="vertical">
          <h2>Select the NFT you want to sell</h2>
          <MetaplexMasonry>
            {items.map(m => {
              const id = m.metadata.pubkey;
              const isSelected = selectedItems.has(id);

              const onSelect = () => {
                let list = [...selectedItems.keys()];
                if (allowMultiple) {
                  list = [];
                }

                const newSet = isSelected
                  ? new Set(list.filter(item => item !== id))
                  : new Set([...list, id]);

                const selected = items.filter(item =>
                  newSet.has(item.metadata.pubkey),
                );
                setSelected(selected);

                if (!allowMultiple) {
                  confirm();
                }
              };

              return (
                <ArtCard
                  key={id}
                  pubkey={m.metadata.pubkey}
                  preview={false}
                  onClick={onSelect}
                />
              );
            })}
          </MetaplexMasonry>
          {allowMultiple && selectedItems.size > 0 && (
            <Button type="primary" size="large" onClick={confirm}>
              Confirm
            </Button>
          )}
        </Space>
      </Modal>
    </>
  );
};
