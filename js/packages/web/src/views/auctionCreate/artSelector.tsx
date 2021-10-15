import React, { useMemo, useState } from 'react';
import { Row, Col, Input, Button, Modal, ButtonProps, Checkbox} from 'antd';
import Masonry from 'react-masonry-css';

import { ArtCard } from '../../components/ArtCard';
import { useUserArts } from '../../hooks';
import { SafetyDepositDraft } from '../../actions/createAuctionManager';

export interface ArtSelectorProps extends ButtonProps {
  selected: SafetyDepositDraft[];
  setSelected: (selected: SafetyDepositDraft[]) => void;
  allowMultiple: boolean;
  filter?: (i: SafetyDepositDraft) => boolean;
  isListView?: boolean;
  title?: string;
  description?: string;
  setCounts?: (e: any, id: string) => void;
  selectedCount?: (id: string) => string;
}

export const ArtSelector = (props: ArtSelectorProps) => {
  const {
    selected,
    setSelected,
    setCounts,
    allowMultiple,
    isListView = false,
    title,
    description,
    selectedCount,
    ...rest
  } = props;
  let items = useUserArts();
  if (props.filter) items = items.filter(props.filter);
  const selectedItems = useMemo<Set<string>>(
    () => new Set(selected.map(item => item.metadata.pubkey)),
    [selected],
  );

  const [visible, setVisible] = useState(false);

  const open = () => {
    clear();

    setVisible(true);
  };

  const openList = () => {
    setVisible(true);
  }

  const close = () => {
    setVisible(false);
  };

  const clear = () => {
    setSelected([]);
  };

  const confirm = () => {
    close();
  };

  const breakpointColumnsObj = {
    default: 4,
    1100: 3,
    700: 2,
    500: 1,
  };
  const breakpointColumnsListObj = {
    default: 1,
  };

  const renderCards = (items) => (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
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

          let selected = items.filter(item =>
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
            className={isSelected ? 'selected-card' : 'not-selected-card'}
          />
        );
      })}
    </Masonry>
  )

  const renderList = (items) => (
    <Masonry
      breakpointCols={breakpointColumnsListObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
      style={{
        width: '100%',
      }}
    >
      <div style={{ padding: '20px 0' }}>
        {
          items.map(m => {
            const id = m.metadata.pubkey;
            const isSelected = selectedItems.has(id);

            const onSelect = () => {
              let list = [...selectedItems.keys()];

              const newSet = isSelected
                ? new Set(list.filter(item => item !== id))
                : new Set([...list, id]);

              let selected = items.filter(item =>
                newSet.has(item.metadata.pubkey),
              );

              setSelected(selected);
            };

            const onAddCount = (e) => {
              e.stopPropagation()
              setCounts && setCounts(e, id)
            }

            return (
              <div
                key={id}
                style={{
                  display: 'flex',
                  padding: '5px 0',
                  borderBottom: '1px solid rgb(96 96 96)',
                }}
              >
                <Checkbox
                  checked={isSelected}
                  onChange={onSelect}
                  style={{
                    width: 35,
                    paddingRight: 10,
                    alignItems: 'center',
                    marginBottom: '0.4em',
                  }}
                />
                <Row
                  justify={'space-between'}
                  style={{
                    width: '100%',
                  }}
                >
                  {/*// TODO add image*/}
                  {/*<Col>*/}
                  {/*  <MetaAvatar creators={creators} size={32} />*/}
                  {/*</Col>*/}
                  <Col
                    flex="90%"
                    style={{
                      display: "flex",
                      alignItems: 'center',
                    }}
                  >
                    {id}
                  </Col>
                  <Col flex="10%">
                    <Input
                      onChange={(e) => onAddCount(e)}
                      type="number"
                      min={0}
                      max={1000}
                      disabled={!isSelected}
                    />
                  </Col>
                </Row>
              </div>
            );
          })
        }
      </div>
    </Masonry>
  )

  return (
    <>
      <Masonry
        breakpointCols={isListView ? breakpointColumnsListObj: breakpointColumnsObj}
        className="my-masonry-grid"
        columnClassName="my-masonry-grid_column"
      >
        {selected.map(m => {
          let key = m?.metadata.pubkey || '';

          return (
            <ArtCard
              key={key}
              pubkey={m.metadata.pubkey}
              preview={false}
              onClick={open}
              count={selectedCount && selectedCount(key)}
              close={() => {
                setSelected(selected.filter(_ => _.metadata.pubkey !== key));
                confirm();
              }}
            />
          );
        })}
        {(allowMultiple || selectedItems.size === 0) && (
          <div
            className="ant-card ant-card-bordered ant-card-hoverable art-card"
            style={{ width: 200, height: 300, display: 'flex' }}
            onClick={isListView ? openList : open}
          >
            <span className="text-center">Add an NFT</span>
          </div>
        )}
      </Masonry>

      <Modal
        visible={visible}
        onCancel={close}
        onOk={confirm}
        width={1100}
        footer={null}
      >
        <Row className="call-to-action" style={{ marginBottom: 0 }}>
          <h2>{title || 'Select the NFT you want to sell'}</h2>
          <p style={{ fontSize: '1.2rem' }}>
            {description || 'Select the NFT that you want to sell copy/copies of.'}
          </p>
        </Row>
        <Row
          className="content-action"
          style={{ overflowY: 'auto', height: '50vh' }}
        >
          {
            isListView
              ? renderList(items)
              : renderCards(items)
          }
        </Row>
        <Row>
          <Button
            type="primary"
            size="large"
            onClick={confirm}
            className="action-btn"
          >
            Confirm
          </Button>
        </Row>
      </Modal>
    </>
  );
};
